import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'
import { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } from './utils/TestFolderGenerator'
import { getFetch, getTestContainer, contextSetup } from './utils/contextSetup'
import { rejectsWithStatus, resolvesWithStatus, testIfHttps } from './utils/jestUtils'
// import { resolvesWithHeader, resolvesWithStatus, rejectsWithStatus } from './utils/expectUtils'

/** @type {SolidApi} */
let api

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'SolidApi-composed', [
  inexistentFile,
  inexistentFolder,
  turtleFile
])

beforeAll(async () => {
  await contextSetup()
  api = new SolidApi(getFetch())
  await container.reset()
})

describe('composed methods', () => {
  describe('itemExists', () => {
    test('itemExists resolves with true on existing file', () => expect(api.itemExists(turtleFile.url)).resolves.toBe(true))
    test('itemExists resolves with true on existing folder', () => expect(api.itemExists(container.url)).resolves.toBe(true))
    test('itemExists resolves with false on inexistent file', () => expect(api.itemExists(inexistentFile.url)).resolves.toBe(false))
    test('itemExists resolves with true on inexistent folder', () => expect(api.itemExists(inexistentFolder.url)).resolves.toBe(false))
  })

  describe('nested methods', () => {
    const filePlaceholder = new FilePlaceholder('placeholder.ttl')
    const folderPlaceholder = new FolderPlaceholder('folder-placeholder')
    const childFile = new File('child-file.ttl')
    const parentFile = new File('parent-file.ttl')
    const emptyFolder = new Folder('empty')
    const childOne = new Folder('child-one', [
      emptyFolder,
      childFile
    ])
    const childTwo = new Folder('child-two')
    const parentFolder = new Folder('parent', [
      childOne,
      childTwo,
      parentFile,
      filePlaceholder
    ])
    const deleteFolder = new BaseFolder(container, 'delete', [
      parentFolder
    ])

    beforeEach(() => deleteFolder.reset())

    describe('delete', () => {
      describe('deleteFolderContents', () => {
        test('rejects with 404 on inexistent folder', () => rejectsWithStatus(api.deleteFolderContents(inexistentFolder.url), 404))
        test.todo('throws some kind of error when called on file')
        test('resolved array contains all names of the deleted items', async () => {
          const responses = await api.deleteFolderContents(parentFolder.url)
          const names = responses.map(response => apiUtils.getItemName(response.headers.get('location')))
          const expectedNames = parentFolder.contents.map(item => apiUtils.getItemName(item.url))
          expect(names.sort()).toEqual(expectedNames.sort())
        })
        test('resolves with empty array on folder without contents', () => expect(api.deleteFolderContents(emptyFolder.url)).resolves.toHaveLength(0))
        test('after deletion itemExists returns false on all contents', async () => {
          await api.deleteFolderContents(parentFolder.url)
          return Promise.all(parentFolder.contents.map(item => expect(api.itemExists(item.url)).resolves.toBe(false)))
        })
      })

      describe('deleteFolderRecursively', () => {
        test('rejects with 404 on inexistent folder', () => rejectsWithStatus(api.deleteFolderRecursively(inexistentFolder.url), 404))
        test.todo('throws some kind of error when called on file')
        test('resolved array contains all names of the delete items', async () => {
          const responses = await api.deleteFolderRecursively(parentFolder.url)
          const names = responses.map(response => apiUtils.getItemName(response.headers.get('location')))
          const expectedNames = [
            apiUtils.getItemName(parentFolder.url),
            ...parentFolder.contents.map(item => apiUtils.getItemName(item.url))
          ]
          expect(names.sort()).toEqual(expectedNames.sort())
        })
        testIfHttps('after deletion itemExists returns false on folder and all contents', async () => {
          await api.deleteFolderRecursively(parentFolder.url)
          await expect(api.itemExists(parentFolder.url)).resolves.toBe(false) // TODO: parentFolder exists in app://ls/ environment
          await Promise.all(parentFolder.contents.map(item => expect(api.itemExists(item.url)).resolves.toBe(false)))
        })
      })
    })

    describe('copy', () => {
      describe('copyFile', () => {
        test('rejects with 404 on inexistent file', () => rejectsWithStatus(api.copyFile(inexistentFile.url, filePlaceholder.url), 404))
        test.todo('throws some kind of error when called on folder')
        test.todo('rejects if no second url is specified')
        // TODO: Change to test(...) when solid-rest supports blobs
        testIfHttps('resolves with 201', () => resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201))
        testIfHttps('resolves and has same content and contentType afterwards', async () => {
          await resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201)
          await expect(api.itemExists(filePlaceholder.url)).resolves.toBe(true)
          const fromResponse = await api.get(childFile.url)
          const toResponse = await api.get(filePlaceholder.url)
          expect(fromResponse.headers.get('Content-Type')).toBe(toResponse.headers.get('Content-Type'))
          expect(await fromResponse.text()).toBe(await toResponse.text())
        })
        test.todo('test different configurations (overwrite, ...)')
      })

      describe('copyFolder', () => {
        test('rejects with 404 on inexistent folder', () => rejectsWithStatus(api.copyFolder(inexistentFolder.url, inexistentFolder.url), 404))
        test.todo('throws some kind of error when called on file')
        test.todo('rejects if no second url is specified')
        testIfHttps('resolves with 201 and copies empty folder', async () => {
          await resolvesWithStatus(api.copyFolder(emptyFolder.url, folderPlaceholder.url), 201)
          await expect(api.itemExists(folderPlaceholder.url)).resolves.toBe(true)
        })
        test.todo('resolves with 201 and copies folder including its contents')
        test.todo('test different configurations (overwrite, ...')
      })
    })
  })
  // TODO: Add remaining methods...
})
