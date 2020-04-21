import contextSetupModule from './utils/contextSetup'
const { contextSetup, getTestContainer, getPrefix, prefixes } = contextSetupModule

async function setup () {
  try {
    await contextSetup()
  } catch (e) {
    console.error("Error in setup.js: Couldn't setup the context")
    throw e
  }

  const prefix = getPrefix()
  console.log(`Running tests with prefix: ${prefix}`)
  if (prefix !== prefixes.memory) {
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
}

export default setup
