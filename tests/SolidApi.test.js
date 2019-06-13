import auth from 'solid-auth-cli';
import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'

const { LINK } = apiUtils

const base = "file://" + process.cwd()
const folder = base + "/test-folder/SolidApi/"
const inexistentFolder = folder + "inexistent/"
const inexistentFile = folder + "inexistent.abc"
const turtleFile = folder + "turtle.ttl"
const turtleFileContents = "<> a <#test>."

const api = new SolidApi(auth.fetch.bind(auth));

// Create container
beforeAll(() => api.createFolder(folder))
beforeAll(() => api.createFile(turtleFile, turtleFileContents, 'text/turtle'))

describe('core methods', () => {
  const coreFolder = folder + "core/"
  const coreFile = coreFolder + "turtle.ttl"
  const content = "<> a <#test>."
  const contentType = "text/turtle"

  const resetCoreFolder = async () => {
    if (await api.itemExists(coreFolder)) {
      await api.deleteFolderContents(coreFolder)
    }
    else {
      await api.createFolder(coreFolder)
    }
    await api.createFile(coreFile, content, contentType)
  }

  beforeAll(resetCoreFolder)

  describe('getters', () => {
    const getters = {
      fetch: api.fetch.bind(api),
      get: api.get.bind(api),
      head: api.head.bind(api),
      // [Not yet supported by solid-auth-cli] options: api.options.bind(api),
    }
    for (const [name, method] of Object.entries(getters)) {
      test(`${name} resolves with 200 for folder`, () => resolvesWithStatus(method(coreFolder), 200))
      test(`${name} resolves with 200 for file`, () => resolvesWithStatus(method(coreFile), 200))
      test(`${name} resolves with Content-Type text/turtle for folder`, () => resolvesWithHeader(method(coreFolder), "Content-Type", contentType))
      test(`${name} resolves with Content-Type ${contentType} for file`, () => resolvesWithHeader(method(coreFile), "Content-Type", contentType))
      test(`${name} rejects with 404 for inexistent folder`, () => rejectsWithStatus(method(inexistentFolder), 404))
      test(`${name} rejects with 404 for inexistent file`, () => rejectsWithStatus(method(inexistentFile), 404))
    }
  })
  
  describe('creators', () => {
    const dataFolder = coreFolder + "post/"
    const fileName = "post.ttl"
    const fileUrl = dataFolder + fileName
    const folderName = "folder/"
    const nestedFolderName = "nested/"
    const nestedFolderUrl = dataFolder + "inexistent/path/" + nestedFolderName
    const nestedFileName = "nested.ttl"
    const nestedFileurl = nestedFolderUrl + nestedFileName
    const nestedFileUrl = dataFolder + "nested/inexisting/path/"
    const folderUrl = dataFolder + folderName
    const usedFileName = "used.ttl"
    const usedFileUrl = dataFolder + usedFileName
    const usedFolderName = "used-folder/"
    const usedFolderUrl = dataFolder + usedFolderName

    const getPostOptions = (name) => {
      return {
        headers: {
          slug: name,
          link: name.endsWith('/') ? LINK.CONTAINER : LINK.RESOURCE
        }
      }
    }

    beforeAll(() => api.createFolder(dataFolder))
    beforeEach(() => api.delete(fileUrl).catch(() => {}))
    beforeEach(() => api.delete(folderUrl).catch(() => {}))
    beforeEach(() => api.delete(nestedFolderUrl).catch(() => {}))
    beforeEach(() => api.delete(nestedFileUrl).catch(() => {}))
    beforeEach(() => api.post(dataFolder, getPostOptions(usedFileName)).catch(() => {}))
    beforeEach(() => api.post(dataFolder, getPostOptions(usedFolderName)).catch(() => {}))

    test('post resolves with 201 creating a new folder', () => resolvesWithStatus(api.post(dataFolder, getPostOptions(folderName)), 201))
    test('post resolves with 201 creating a new file', () => resolvesWithStatus(api.post(dataFolder, getPostOptions(fileName)), 201))
    test('post rejects with 404 on inexistent container', () => rejectsWithStatus(api.post(nestedFolderUrl, getPostOptions(nestedFileName)), 404))
    // TODO: [Add when supported by solid-rest] test('post resolves with 201 writing to the location of an existing folder', () => resolvesWithStatus(api.post(dataFolder, getPostOptions(usedFolderName)), 201))
    // TODO: [Add when supported by solid-rest] test('post resolves with 201 writing to the location of an existing file', () => resolvesWithHeader(api.post(dataFolder, getPostOptions(usedFileName)), 201))

    test('put resolves with 201 creating a new file', () => resolvesWithStatus(api.put(fileUrl), 201))
    test('put resolves with 201 overwriting a file', () => resolvesWithStatus(api.put(usedFileUrl), 201))
    // TODO: [Add when supported by solid-rest] test('put resolves with 201 creating a nested files', () => resolvesWithStatus(api.put(nestedFileUrl), 201))
  })
})

describe('composed methods', () => {
  describe('itemExists', () => {
    test('itemExists resolves with true on existing file', () => expect(api.itemExists(turtleFile)).resolves.toBe(true))
    test('itemExists resolves with true on existing folder', () => expect(api.itemExists(folder)).resolves.toBe(true))
    test('itemExists resolves with false on inexistent file', () => expect(api.itemExists(inexistentFile)).resolves.toBe(false))
    test('itemExists resolves with true on inexistent folder', () => expect(api.itemExists(inexistentFolder)).resolves.toBe(false))
  })

  // TODO: Add remaining methods...
})


/**
 * @param {Promise<Response>} promise 
 * @param {number} status https://jestjs.io/docs/en/setup-teardown
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
