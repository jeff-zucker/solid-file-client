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

  describe('create', () => {
    const nestedFilePlaceholder = new FilePlaceholder('nested.ttl')
    const nestedFolderPlaceholder = new FolderPlaceholder('nested-folder')
    const filePlaceholder = new FilePlaceholder('file.ttl')
    const folderPlaceholder = new FolderPlaceholder('folder', [
      nestedFilePlaceholder,
      nestedFolderPlaceholder
    ])
    const usedFile = new File('existing.ttl')
    const fileInUsedFolder = new File('some-file.ttl')
    const usedFolder = new Folder('existing-folder', [
      fileInUsedFolder
    ])

    const createContainer = new BaseFolder(container, 'create', [
      filePlaceholder,
      folderPlaceholder,
      usedFile,
      usedFolder
    ])

    beforeEach(() => createContainer.reset())

    describe('createItem', () => {
      // Tests for createItem may be redundant as createFolder and createItem probably cover everything
      // If something is not covered by these two methods, add it here
      test.todo('Consider adding tests for createItem')
    })

    describe('createFolder', () => {
      test('resolves with 200 on existing folder and is not modified', async () => {
        await resolvesWithStatus(api.createFolder(usedFolder.url), 200)
        await expect(api.itemExists(fileInUsedFolder.url)).resolves.toBe(true)
      })
      test('resolves with 201 on existing folder with options.overwriteFolders and is empty afterwards', async () => {
        await resolvesWithStatus(api.createFolder(usedFolder.url, { overwriteFolders: true }), 201)
        await expect(api.itemExists(fileInUsedFolder.url)).resolves.toBe(false)
      })
      test('resolves with 201 on inexistent folder with parent', () => {
        return resolvesWithStatus(api.createFolder(folderPlaceholder.url), 201)
      })
      test('resolves with 201 on inexistent folder with parent and options.createPath=false', () => {
        return resolvesWithStatus(api.createFolder(folderPlaceholder.url), 201)
      })
      test('resolves with 201 on inexistent folder without parent', () => {
        return resolvesWithStatus(api.createFolder(nestedFolderPlaceholder.url), 201)
      })
      test('rejects with 404 on folder without parent with options.createPath=false', () => {
        return rejectsWithStatus(api.createFolder(nestedFolderPlaceholder.url, { createPath: false }), 404)
      })
    })

    describe('createFile', () => {
      const content = '<> a <#newContent>.'
      const contentType = 'text/turtle'

      test('resolves with 201 on existing file and has new content', async () => {
        await resolvesWithStatus(api.createFile(usedFile.url, content, contentType), 201)
        const res = await api.fetch(usedFile.url)
        expect(await res.text()).toBe(content)
        expect(await res.headers.get('content-type')).toMatch(contentType)
      })
      test('rejects on existing file if options.overwriteFiles=false', () => {
        return expect(api.createFile(usedFile.url, content, contentType, { overwriteFiles: false })).rejects.toBeDefined()
      })
      test('resolves with 201 on inexistent file', () => {
        return resolvesWithStatus(api.createFile(filePlaceholder.url, content, contentType), 201)
      })
      test('resolves with 201 on inexistent nested file', () => {
        return resolvesWithStatus(api.createFile(nestedFilePlaceholder.url, content, contentType), 201)
      })
      test('rejects with 404 on inexistent nested file with options.createPath=false', () => {
        return rejectsWithStatus(api.createFile(nestedFilePlaceholder.url, content, contentType, { createPath: false }), 404)
      })
      test.todo('Add tests for binary files (images, audio, ...)')
    })
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
          const urls = responses.map(response => response.url)
          const expectedUrls = parentFolder.contents.map(item => item.url)
          expect(urls.sort()).toEqual(expectedUrls.sort())
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
          const urls = responses.map(response => response.url)
          const expectedUrls = [
            parentFolder.url,
            ...parentFolder.contents.map(item => item.url)
          ]
          expect(urls.sort()).toEqual(expectedUrls.sort())
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
        test('rejects if no second url is specified', () => expect(api.copyFile(childFile.url)).rejects.toBeDefined())
        // TODO: Change to test(...) when solid-rest supports blobs
        test('resolves with 201', () => resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201))
        test('resolves and has same content and contentType afterwards', async () => {
          await resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201)
          await expect(api.itemExists(filePlaceholder.url)).resolves.toBe(true)
          const fromResponse = await api.get(childFile.url)
          const toResponse = await api.get(filePlaceholder.url)
          expect(fromResponse.headers.get('Content-Type')).toBe(toResponse.headers.get('Content-Type'))
          expect(await fromResponse.text()).toBe(await toResponse.text())
        })
        test.todo('throws some kind of error when called on folder')
        test.todo('test different configurations (overwrite, ...)')
      })

      describe('copyFolder', () => {
        test('rejects with 404 on inexistent folder', () => rejectsWithStatus(api.copyFolder(inexistentFolder.url, inexistentFolder.url), 404))
        test('rejects if no second url is specified', () => expect(api.copyFolder(emptyFolder.url)).rejects.toBeDefined())
        test('resolves and copies empty folder', async () => {
          await expect(api.copyFolder(emptyFolder.url, folderPlaceholder.url)).resolves.toBeDefined()
          await expect(api.itemExists(folderPlaceholder.url)).resolves.toBe(true)
        })
        test.todo('resolves with 201 and copies folder including its contents')
        test.todo('throws some kind of error when called on file')
        test.todo('test different configurations (overwrite, ...')
      })
    })
  })
  // TODO: Add remaining methods...
})
