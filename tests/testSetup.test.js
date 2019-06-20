import SolidApi from '../src/SolidApi'
import { File, FolderPlaceholder, FilePlaceholder, BaseFolder } from './utils/TestFolderGenerator'
import { getFetch, getTestContainer, contextSetup } from './utils/contextSetup'

let api

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'setup-test', [
  inexistentFile,
  inexistentFolder,
  turtleFile,
])

beforeAll(async () => {
  await contextSetup()
  api = new SolidApi(getFetch())
  await container.reset()
})

describe('setup test', () => {
    test('true', () => expect(true).toBe(true))
})
