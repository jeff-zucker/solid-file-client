import auth from 'solid-auth-cli';
import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'
import { Folder, File, RootFolder } from './utils/TestFolderGenerator'

const { LINK } = apiUtils

const base = "file://" + process.cwd() + "/test-folder/"
const container = new RootFolder(base, "SolidApi")
const inexistentFolder = container.url + "inexistent/"
const inexistentFile = container.url + "inexistent.abc"

const api = new SolidApi(auth.fetch.bind(auth));

// Reset container
beforeAll(() => container.reset())

describe('core methods', () => {
  const coreFile = new File("turtle.ttl", "<> a <#test>.")
  const contentType = "text/turtle"

  const coreFolder = new RootFolder(container, 'core', [
    coreFile
  ])

  beforeAll(() => coreFolder.reset())

  describe('getters', () => {
    const getters = {
      fetch: api.fetch.bind(api),
      get: api.get.bind(api),
      head: api.head.bind(api),
      // TODO: [Add this when supported by solid-rest] options: api.options.bind(api),
    }
    for (const [name, method] of Object.entries(getters)) {
      test(`${name} resolves with 200 for folder`, () => resolvesWithStatus(method(coreFolder.url), 200))
      test(`${name} resolves with 200 for file`, () => resolvesWithStatus(method(coreFile.url), 200))
      test(`${name} resolves with Content-Type text/turtle for folder`, () => resolvesWithHeader(method(coreFolder.url), "Content-Type", contentType))
      test(`${name} resolves with Content-Type ${contentType} for file`, () => resolvesWithHeader(method(coreFile.url), "Content-Type", contentType))
      test(`${name} rejects with 404 for inexistent folder`, () => rejectsWithStatus(method(inexistentFolder), 404))
      test(`${name} rejects with 404 for inexistent file`, () => rejectsWithStatus(method(inexistentFile), 404))
    }
  })
  
  describe('creators', () => {
    const usedFolder = new Folder('used-folder')
    const usedFile = new File('used.ttl')

    const postFolder = new RootFolder(coreFolder, 'post', [
      usedFolder,
      usedFile,
    ])
  
    const newFile = "post.ttl"
    const newFileUrl = postFolder.url + newFile
    const newFolder = "folder/"
    const nestedFolderName = "nested/"
    const nestedFolderUrl = postFolder.url + "inexistent/path/" + nestedFolderName
    const nestedFileName = "nested.ttl"
    const nestedFileUrl = nestedFolderUrl + nestedFileName

    const getPostOptions = (name) => {
      const slug = name.replace(/\/$/,'')
      const link = name.endsWith('/') ? LINK.CONTAINER : LINK.RESOURCE
      return {
        headers: {
          slug,
          link,
        }
      }
    }

    let invalidSlugOptions = getPostOptions(newFolder)
    invalidSlugOptions.headers.slug += '/';

    beforeEach(() => postFolder.reset({ dryRun: false }))

    test('post resolves with 201 creating a new folder with valid slug', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFolder)), 201))
    test('post resolves with 400 creating a new folder with invalid slug', () => rejectsWithStatus(api.post(postFolder.url, invalidSlugOptions), 400))    
    test('post resolves with 201 creating a new file', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFile)), 201))
    test('post rejects with 404 on inexistent container', () => rejectsWithStatus(api.post(nestedFolderUrl, getPostOptions(nestedFileName)), 404))
    test('post resolves with 201 writing to the location of an existing folder', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFolder)), 201))
    test('post resolves with 201 writing to the location of an existing file', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFile)), 201))

    test('put resolves with 201 creating a new file', () => resolvesWithStatus(api.put(newFileUrl), 201))
    test('put resolves with 201 overwriting a file', () => resolvesWithStatus(api.put(usedFile.url), 201))
    test('put resolves with 201 creating a nested files', () => resolvesWithStatus(api.put(nestedFileUrl), 201)) 
  })
})

describe('composed methods', () => {
  const turtleFile = new File('composed.ttl')
  const composedFolder = new RootFolder(container, 'composed', [
  	turtleFile
  ])
  beforeAll(() => composedFolder.reset())

  describe('itemExists', () => {
    test('itemExists resolves with true on existing file', () => expect(api.itemExists(turtleFile.url)).resolves.toBe(true))
    test('itemExists resolves with true on existing folder', () => expect(api.itemExists(container.url)).resolves.toBe(true))
    test('itemExists resolves with false on inexistent file', () => expect(api.itemExists(inexistentFile)).resolves.toBe(false))
    test('itemExists resolves with true on inexistent folder', () => expect(api.itemExists(inexistentFolder)).resolves.toBe(false))
  })

  describe('delete', () => {
    const childFile = new File('child-file.ttl')
    const parentFile = new File('parent-file.ttl')
    const grandChild = new Folder('grand-child')
    const childOne = new Folder('child-one', [
      grandChild,
      childFile,
    ])
    const childTwo = new Folder('child-two')
    const parentFolder = new Folder('parent', [
      childOne,
      childTwo,
      parentFile,
    ])
    const deleteFolder = new RootFolder(composedFolder, 'delete', [
      parentFolder,
    ])

    beforeEach(() => deleteFolder.reset())

    describe('deleteFolderContents', () => {
      test('resolved array contains one entry per deleted item', async () => {
        const responses = await api.deleteFolderContents(parentFolder.url)
        const names = responses.map(response => apiUtils.getItemName(response.headers.get('location')))
        parentFolder.contents.forEach(item => expect(names).toContain(apiUtils.getItemName(item.url)))
      })
      test('resolves with empty array on folder without contents', () => expect(api.deleteFolderContents(grandChild.url)).resolves.toHaveLength(0))
      test('after deletion itemExists returns false on all contents', async () => {
        await api.deleteFolderContents(parentFolder.url)
        return parentFolder.contents.map(item => expect(api.itemExists(item.url)).resolves.toBe(false))
      })
    })
  })
  // TODO: Add remaining methods...
})


/**
 * @param {Promise<Response>} promise 
 * @param {number} status
 */
function resolvesWithStatus(promise, status) {
  return expect(promise).resolves.toHaveProperty('status', status)
}

/**
 * @param {Promise<Response>} promise 
 * @param {number} status 
 */
function rejectsWithStatus(promise, status) {
  return expect(promise).rejects.toHaveProperty('status', status)
}

/**
 * @param {Promise<Response>} promise
 * @param {string} name
 * @param {string} value
 */
async function resolvesWithHeader(promise, name, value) {
  const response = await promise
  const header = response.headers.get(name)
  return expect(header).toMatch(value)
}
