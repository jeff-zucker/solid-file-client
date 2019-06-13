import { RootFolder } from './utils/TestFolderGenerator'

const base = "file://" + process.cwd()
const testContainer = new RootFolder(base, 'test-folder')

async function setup() {
  try {
    await testContainer.reset({ dryRun: false })
  }
  catch (e) {
    console.error("Error in setup.js: Couldn't reset test-folder")
    console.trace()
    console.error(e)
    throw e
  }
}

export default setup
