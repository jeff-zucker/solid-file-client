import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import SolidAPI from '../src/SolidApi'

const { File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator
const { getTestContainer, contextSetup, getFetch } = contextSetupModule

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'setup-test', [
  inexistentFile,
  inexistentFolder,
  turtleFile
])

/** @type {SolidAPI} */
let api

beforeAll(async () => {
  await contextSetup()
  api = new SolidAPI(getFetch())
})

beforeEach(() => container.reset())

describe('setup test', () => {
  test('true', () => expect(true).toBe(true))
  test('container exists', () => expect(api.itemExists(container.url)).resolves.toBe(true))
  test('can delete container', async () => {
    await expect(api.delete(turtleFile.url)).resolves.toBeDefined()
    await expect(api.delete(container.url)).resolves.toBeDefined()
    return expect(api.itemExists(container.url)).resolves.toBe(false)
  })
})
