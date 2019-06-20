import SolidApi from '../src/SolidApi'
import apiUtils from '../src/utils/apiUtils'
import { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } from './utils/TestFolderGenerator'
import { getFetch, getTestContainer, contextSetup } from './utils/contextSetup'
// import { resolvesWithHeader, resolvesWithStatus, rejectsWithStatus } from './utils/expectUtils'

let api

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'SolidApi-composed', [
  inexistentFile,
  inexistentFolder,
  turtleFile,
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
    const deleteFolder = new BaseFolder(container, 'delete', [
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
