import auth from 'solid-auth-cli';
import SolidFileClient from '../src/index'

const base = "file://" + process.cwd()
const testContainerFolder = base + "/test-folder/"
const fileClient = new SolidFileClient(auth)

async function setup() {
  try {
    if (!(await fileClient.itemExists(testContainerFolder))) {
      await fileClient.createFolder(testContainerFolder)
    }
    await fileClient.deleteFolderContents(testContainerFolder)
  }
  catch (e) {
    console.error('Error while setting up the test cases')
    console.error(e)
    throw e
  }
}

export default setup
