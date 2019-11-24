import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'
import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import { resolvesWithHeader, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const { getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator
const { LINK } = apiUtils

/** @type {SolidApi} */
let api

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'SolidApi-core', [
  inexistentFile,
  inexistentFolder,
  turtleFile
])

jest.setTimeout(20 * 1000)

beforeAll(async () => {
  await contextSetup()
  api = new SolidApi(getFetch())
  await container.reset()
})

describe('core methods', () => {
  describe('getters', () => {
    const getters = {
      fetch: (...args) => api.fetch.bind(api)(...args),
      get: (...args) => api.get.bind(api)(...args),
      head: (...args) => api.head.bind(api)(...args)
      // TODO: [Add this when supported by solid-rest] options: (...args) => api.options.bind(api)(...args),
    }
    for (const [name, method] of Object.entries(getters)) {
      test(`${name} resolves with 200 for folder`, () => resolvesWithStatus(method(container.url), 200))
      test(`${name} resolves with 200 for file`, () => resolvesWithStatus(method(turtleFile.url), 200))
      test(`${name} resolves with Content-Type text/turtle for folder`, () => resolvesWithHeader(method(container.url), 'Content-Type', 'text/turtle'))
      test(`${name} resolves with Content-Type text/turtle for file`, () => resolvesWithHeader(method(turtleFile.url), 'Content-Type', 'text/turtle'))
      test(`${name} rejects with 404 for inexistent folder`, () => rejectsWithStatus(method(inexistentFolder.url), 404))
      test(`${name} rejects with 404 for inexistent file`, () => rejectsWithStatus(method(inexistentFile.url), 404))
    }
  })

  describe('creators', () => {
    const newFilePlaceholder = new FilePlaceholder('post.ttl')
    const newFolderPlaceholder = new FolderPlaceholder('folder')
    const nestedFilePlaceholder = new FilePlaceholder('nested.ttl')
    const nestedFolderPlaceholder = new FolderPlaceholder('nested-folder', [
      nestedFilePlaceholder
    ])

    const usedFolder = new Folder('used-folder')
    const usedFile = new File('used.ttl')

    const postFolder = new BaseFolder(container, 'post', [
      usedFolder,
      usedFile,
      newFilePlaceholder,
      newFolderPlaceholder,
      new FolderPlaceholder('inexistent', [
        new FolderPlaceholder('path', [
          nestedFolderPlaceholder
        ])
      ])
    ])

    const getPostOptions = (name) => {
      const slug = name.replace(/\/$/, '')
      const link = name.endsWith('/') ? LINK.CONTAINER : LINK.RESOURCE
      return {
        headers: {
          slug,
          link,
          'Content-Type': 'text/turtle'
        }
      }
    }

    const invalidSlugOptions = getPostOptions(newFolderPlaceholder.name)
    invalidSlugOptions.headers.slug += '/'

    beforeEach(() => postFolder.reset())

    test('post resolves with 201 creating a new folder with valid slug', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFolderPlaceholder.name)), 201))
    test('post resolves with 400 creating a new folder with invalid slug', () => rejectsWithStatus(api.post(postFolder.url, invalidSlugOptions), 400))
    test('post resolves with 201 creating a new file', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(newFilePlaceholder.name)), 201))
    test('post rejects with 404 on inexistent container', () => rejectsWithStatus(api.post(nestedFolderPlaceholder.url, getPostOptions(nestedFilePlaceholder.name)), 404))
    test('post resolves with 201 writing to the location of an existing folder', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(usedFolder.name)), 201))
    test('post resolves with 201 writing to the location of an existing file', () => resolvesWithStatus(api.post(postFolder.url, getPostOptions(usedFile.name)), 201))

    test('put resolves with 201 creating a new file', () => resolvesWithStatus(api.put(newFilePlaceholder.url), 201))
    test('put resolves with 201 overwriting a file', () => resolvesWithStatus(api.put(usedFile.url), 201))
    test('put resolves with 201 creating a nested files', () => resolvesWithStatus(api.put(nestedFilePlaceholder.url), 201))
  })

  describe('delete', () => {
    const file = new File('turtle.ttl')
    const emptyFolder = new Folder('empty')
    const filledFolder = new Folder('filled', [
      file,
      emptyFolder
    ])
    const deleteFolder = new BaseFolder(container, 'delete', [
      filledFolder
    ])

    beforeEach(() => deleteFolder.reset())

    test('delete rejects with 404 on an inexistent file', () => rejectsWithStatus(api.delete(inexistentFile.url), 404))
    test('delete rejects with 404 on an inexistent folder', () => rejectsWithStatus(api.delete(inexistentFolder.url), 404))
    test('delete resolves deleting a file and it does not exist afterwards', async () => {
      await expect(api.delete(file.url)).resolves.toBeDefined()
      return expect(api.itemExists(file.url)).resolves.toBe(false)
    })
    test('delete resolves deleting an empty folder and it does not exist afterwards', async () => {
      await expect(api.delete(emptyFolder.url)).resolves.toBeDefined()
      return expect(api.itemExists(emptyFolder.url)).resolves.toBe(false)
    })
    test('delete rejects deleting a folder with contents inside it', async () => {
      return rejectsWithStatus(api.delete(filledFolder.url), 409)
    })
  })
})
