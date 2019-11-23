import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'
import { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } from './utils/TestFolderGenerator'
import { getFetch, getTestContainer, contextSetup } from './utils/contextSetup'
import { rejectsWithStatus, resolvesWithStatus, rejectsWithStatuses } from './utils/jestUtils'
import errorUtils from '../src/utils/errorUtils'

const { FetchError, ComposedFetchError } = errorUtils

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

jest.setTimeout(20 * 1000)

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

    describe('putFile', () => {
      const content = '<> a <#newContent>.'
      const contentType = 'text/turtle'

      test('resolves with 201 on existing file and has new content', async () => {
        await resolvesWithStatus(api.putFile(usedFile.url, content, contentType), 201)
        const res = await api.fetch(usedFile.url)
        expect(await res.text()).toBe(content)
        expect(await res.headers.get('content-type')).toMatch(contentType)
      })
      test('rejects on existing file if options.overwriteFiles=false', () => {
        return expect(api.putFile(usedFile.url, content, contentType, { overwriteFiles: false })).rejects.toBeDefined()
      })
      test('resolves with 201 on inexistent file', () => {
        return resolvesWithStatus(api.putFile(filePlaceholder.url, content, contentType), 201)
      })
      test('resolves with 201 on inexistent nested file', () => {
        return resolvesWithStatus(api.putFile(nestedFilePlaceholder.url, content, contentType), 201)
      })
      test('rejects on inexistent nested file with options.createPath=false', () => {
        return expect(api.putFile(nestedFilePlaceholder.url, content, contentType, { createPath: false })).rejects.toBeDefined()
      })
      test.todo('Add tests for binary files (images, audio, ...)')
    })
  })

  describe('nested methods', () => {
    const filePlaceholder = new FilePlaceholder('placeholder.ttl')
    const folderPlaceholder = new FolderPlaceholder('folder-placeholder')
    const childFile = new File('child-file.ttl', 'I am a child')
    const childFileTwo = new File('child-file.ttl', 'I am the second child')
    const parentFile = new File('parent-file.ttl', 'I am a parent')
    const emptyFolder = new Folder('empty')
    const childOne = new Folder('child-one', [
      emptyFolder,
      childFile
    ])
    const childTwo = new Folder('child-two', [
      childFileTwo
    ])
    const parentFolder = new Folder('parent', [
      childOne,
      childTwo,
      parentFile,
      filePlaceholder,
      folderPlaceholder
    ])
    const deleteFolder = new BaseFolder(container, 'delete', [
      parentFolder
    ])

    beforeEach(() => deleteFolder.reset())

    describe('delete', () => {
      describe('deleteFolderContents', () => {
        test('rejects with 404 on inexistent folder', () => rejectsWithStatuses(api.deleteFolderContents(inexistentFolder.url), [404]))
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
        test('rejects with 404 on inexistent folder', () => rejectsWithStatuses(api.deleteFolderRecursively(inexistentFolder.url), [404]))
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
        test('after deletion itemExists returns false on folder and all contents', async () => {
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
        test('resolves with 201', () => resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201))
        test('resolves and has same content and contentType afterwards', async () => {
          await resolvesWithStatus(api.copyFile(childFile.url, filePlaceholder.url), 201)
          await expect(api.itemExists(filePlaceholder.url)).resolves.toBe(true)
          const fromResponse = await api.get(childFile.url)
          const toResponse = await api.get(filePlaceholder.url)
          expect(fromResponse.headers.get('Content-Type')).toBe(toResponse.headers.get('Content-Type'))
          expect(await fromResponse.text()).toBe(await toResponse.text())
        })
        test('rejects when copying to existent file with overwriteFiles=false', () => {
          return expect(api.copyFile(childFile.url, childFileTwo.url, { overwriteFiles: false })).rejects.toThrowError('already existed')
        })
        test.todo('throws some kind of error when called on folder')
      })

      describe('copyFolder', () => {
        test('rejects with 404 on inexistent folder', async () => rejectsWithStatus(api.copyFolder(inexistentFolder.url, inexistentFolder.url), 404))
        test('rejects if no second url is specified', () => expect(api.copyFolder(emptyFolder.url)).rejects.toBeDefined())
        test('resolves and copies empty folder', async () => {
          await expect(api.copyFolder(emptyFolder.url, folderPlaceholder.url)).resolves.toBeDefined()
          await expect(api.itemExists(folderPlaceholder.url)).resolves.toBe(true)
        })
        test('resolves copying folder with depth 1', () => {
          return expect(api.copyFolder(childOne.url, folderPlaceholder.url)).resolves.toBeDefined()
        })
        test('resolves with 201 and copies folder with depth 1 including its contents', async () => {
          const responses = await api.copyFolder(childOne.url, folderPlaceholder.url)
          expect(responses).toHaveLength(childOne.contents.length + 1)
          expect(responses[0]).toHaveProperty('url', apiUtils.getParentUrl(folderPlaceholder.url))
          expect(responses[0]).toHaveProperty('status', 201)

          await expect(api.itemExists(folderPlaceholder.url)).resolves.toBe(true)
          await expect(api.itemExists(`${folderPlaceholder.url}${emptyFolder.name}/`)).resolves.toBe(true)
          await expect(api.itemExists(`${folderPlaceholder.url}${childFile.name}`)).resolves.toBe(true)
        })
        test('resolves copying folder with depth 2', async () => {
          const responses = await api.copyFolder(parentFolder.url, folderPlaceholder.url)
          expect(responses).toHaveLength(parentFolder.contents.length + 1)
          expect(responses[0]).toHaveProperty('url', apiUtils.getParentUrl(folderPlaceholder.url))
          expect(responses[0]).toHaveProperty('status', 201)

          await expect(api.itemExists(folderPlaceholder.url)).resolves.toBe(true)
          // Note: Could test for others to exist too
        })
        test('merges folders when copying to an already existing folder', async () => {
          await expect(api.copyFolder(childOne.url, parentFolder.url)).resolves.toBeDefined()
          await expect(api.itemExists(`${parentFolder.url}${emptyFolder.name}/`)).resolves.toBe(true)
          await expect(api.itemExists(`${parentFolder.url}${childFile.name}`)).resolves.toBe(true)
        })
        test('rejects when merging folders and files exist with option overwriteFiles=false', () => {
          return expect(api.copyFolder(childOne.url, childTwo.url, { overwriteFiles: false })).rejects.toThrow(/already existed/)
        })
        test('deletes old contents when copying to an existing folder with overwriteFolders=true', async () => {
          await expect(api.copyFolder(childTwo.url, childOne.url, { overwriteFolders: true })).resolves.toBeDefined()
          await expect(api.itemExists(childOne.url)).resolves.toBe(true)
          await expect(api.itemExists(childFile.url)).resolves.toBe(true) // Was in childTwo and childOne
          await expect(api.itemExists(emptyFolder.url)).resolves.toBe(false) // Was only in  childOne
        })
        test.todo('throws some kind of error when called on file')
        test.todo('throws flattened errors when it fails in multiple levels')
      })
    })

    describe('move', () => {
      test('rejects with 404 on inexistent item', () => {
        return rejectsWithStatuses(api.move(inexistentFile.url, filePlaceholder.url), [404])
      })

      describe('moving file', () => {
        test('resolves with 201 moving existing to inexistent file', async () => {
          const responses = await api.move(childFile.url, filePlaceholder.url)
          expect(responses).toHaveLength(1)
          expect(responses[0]).toHaveProperty('status', 201)
          expect(responses[0]).toHaveProperty('url', filePlaceholder.url)
        })
        test('resolves moving existing to existing file', () => {
          return expect(api.move(childFile.url, parentFile.url)).resolves.toBeDefined()
        })
        test('rejects moving existing to existing file with overwriteFiles=false', async () => {
          await expect(api.move(childFile.url, parentFile.url, { overwriteFiles: false })).rejects.toThrowError('already existed')
          await expect(api.itemExists(childFile.url)).resolves.toBe(true)
        })
        test('overwrites new location and deletes old one', async () => {
          await expect(api.move(childFile.url, parentFile.url)).resolves.toBeDefined()

          await expect(api.itemExists(childFile.url)).resolves.toBe(false)
          await expect(api.itemExists(parentFile.url)).resolves.toBe(true)
          const res = await api.get(parentFile.url)
          const content = await res.text()
          await expect(content).toEqual(childFile.content)
        })
      })

      describe('moving folder', () => {
        test('resolves with 201 moving empty folder to placeholder', async () => {
          const responses = await api.move(emptyFolder.url, folderPlaceholder.url)
          expect(responses).toHaveLength(1)
          expect(responses[0]).toHaveProperty('status', 201)
          expect(responses[0]).toHaveProperty('url', apiUtils.getParentUrl(folderPlaceholder.url))
        })
        test('resolves with 201 moving a folder with depth 2 to placeholder', async () => {
          // Note: This example doesn't really makes sense because folderPlaceholder is inside parentFolder
          // Nonetheless it checks whether or not it works in principle
          const responses = await api.move(parentFolder.url, folderPlaceholder.url)
          expect(responses).toHaveLength(parentFolder.contents.length + 1)
          expect(responses[0]).toHaveProperty('status', 201)
          expect(responses[0]).toHaveProperty('url', apiUtils.getParentUrl(folderPlaceholder.url))
        })
        test('resolves moving folder with depth 1 to folder with depth 1', () => {
          return expect(api.move(childTwo.url, childOne.url)).resolves.toBeDefined()
        })
        test('rejects moving folder to existing folder with similar contents with overwriteFiles=false', async () => {
          await expect(api.move(childTwo.url, childOne.url, { overwriteFiles: false })).rejects.toEqual(expect.arrayContaining([expect.any(Error)]))
          await expect(api.itemExists(childTwo.url)).resolves.toBe(true)
        })
        test('overwrites new folder contents and deletes old one', async () => {
          await expect(api.move(childOne.url, childTwo.url)).resolves.toBeDefined()

          await expect(api.itemExists(childOne.url)).resolves.toBe(false)
          await expect(api.itemExists(childTwo.url)).resolves.toBe(true)
          await expect(api.itemExists(childFileTwo.url)).resolves.toBe(true)
          await expect(api.itemExists(`${childTwo.url}${emptyFolder.name}/`)).resolves.toBe(true)

          const fileResponse = await api.get(childFileTwo.url)
          const content = await fileResponse.text()
          expect(content).toEqual(childFile.content)
        })
      })
    })

    describe('rename', () => {
      test('rejects with 404 on inexistent item', () => {
        return rejectsWithStatuses(api.rename(inexistentFile.url, 'abc.txt'), [404])
      })

      describe('rename file', () => {
        test('resolves with existing file', () => {
          return expect(api.rename(childFile.url, 'new-name.txt')).resolves.toBeDefined()
        })
        test('resolves with 201 and creates new file and deletes old', async () => {
          const newName = 'new-name.txt'
          const newUrl = `${apiUtils.getParentUrl(childFile.url)}${newName}`
          const responses = await api.rename(childFile.url, newName)
          expect(responses).toHaveLength(1)
          expect(responses[0]).toHaveProperty('status', 201)
          expect(responses[0]).toHaveProperty('url', apiUtils.getParentUrl(childFile.url) + newName)

          await expect(api.itemExists(childFile.url)).resolves.toBe(false)
          await expect(api.itemExists(newUrl)).resolves.toBe(true)
          const response = await api.get(newUrl)
          const content = await response.text()
          expect(content).toEqual(childFile.content)
        })
        test.todo('rejects when renaming to existing file')
      })
    })
  })
})

test.todo('Add tests with different settings of createPath=false')
