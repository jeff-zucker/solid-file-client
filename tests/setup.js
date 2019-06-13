const fs = require("fs")
const rimraf = require("rimraf");

const testContainerFolder = "./test-folder"

function setup() {
  return new Promise((resolve, reject) => {
    // Remove the test folder
    rimraf(testContainerFolder, err => {
      try {
        if (err) {
          throw err
        }
        // Create an empty test folder
        fs.mkdirSync(testContainerFolder)
        return resolve()
      }
      catch (e) {
        console.error("Error in setup.js: Couldn't reset test-folder")
        console.trace()
        console.error(e)
        return reject(e)
      }
    })
  })
}

export default setup
