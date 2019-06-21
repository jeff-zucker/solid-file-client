import { File, FolderPlaceholder, FilePlaceholder, BaseFolder } from './utils/TestFolderGenerator'
import { getTestContainer, contextSetup } from './utils/contextSetup'

const inexistentFolder = new FolderPlaceholder('inexistent')
const inexistentFile = new FilePlaceholder('inexistent.abc')
const turtleFile = new File('turtle.ttl', '<> a <#test>.', 'text/turtle')
const container = new BaseFolder(getTestContainer(), 'setup-test', [
  inexistentFile,
  inexistentFolder,
  turtleFile
])

beforeAll(async () => {
  await contextSetup()
  await container.reset()
})

describe('setup test', () => {
  test('true', () => expect(true).toBe(true))
})
