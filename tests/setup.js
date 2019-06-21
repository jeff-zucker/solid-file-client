import { contextSetup, getTestContainer, getPrefix, prefixes } from './utils/contextSetup'

async function setup () {
  console.group('setup')
  try {
    await contextSetup()
  } catch (e) {
    console.error("Error in setup.js: Couldn't setup the context")
    throw e
  }

  if (getPrefix() !== prefixes.memory) {
    // Note: app://ls/ is not persistent and shared across multiple test files
    // Therefore it needs to be initialized before each test somewhere else
    try {
      const testContainer = getTestContainer()
      await testContainer.reset()
    } catch (e) {
      console.error("Error in setup.js: Couldn't reset test-folder")
      throw e
    }
  }
  console.log('finished setup.js')
  console.groupEnd()
}

export default setup
