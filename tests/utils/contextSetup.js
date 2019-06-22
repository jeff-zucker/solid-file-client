const auth = require('solid-auth-cli')

const prefixes = {
  file: 'file://',
  memory: 'app://ls/',
  https: 'https://'
}

// Create dummy variables which have to be overwritten in the setup
const prefix = process.env.TEST_PREFIX || 'app://ls/'
let baseUrl, testContainer, testFetch
let hasBeenSetup = false

/**
 * Setup the testing environment
 * Login the user if required
 */
async function contextSetup () {
  console.group('context setup')
  if (!Object.values(prefixes).includes(prefix)) {
    throw new Error(`TEST_PREFIX must be one of ${Object.values(prefixes).join(' ')}. Found: ${prefix}`)
  }

  baseUrl = await getBaseUrl(prefix)
  testFetch = createTestFetch(baseUrl, auth.fetch.bind(auth))
  auth.fetch = testFetch
  hasBeenSetup = true

  if (prefix === prefixes.memory) {
    // Memory tests don't share a common storage, hence reset the container every time contextSetup is called
    await getTestContainer().reset()
  }
  console.log('Finished context setup')
  console.groupEnd()
}

function getTestContainer () {
  if (!testContainer) {
    const { Folder } = require('./TestFolderGenerator')
    testContainer = new Folder('test-folder')
  }
  return testContainer
}

/**
 * Get the base url for testFetch calls
 * @param {string} prefix
 * @returns {Promise<string>}
 */
async function getBaseUrl (prefix) {
  let baseUrl
  switch (prefix) {
    case prefixes.file:
      baseUrl = `${prefix}${process.cwd()}/`
      break

    case prefixes.memory:
      baseUrl = prefix
      break

    case prefixes.https:
      try {
        await auth.login()
        console.log('Successfully logged in')
        if (!process.env.TEST_BASE_URL) {
          throw new Error('Please specify the base url if you use the https prefix')
        }
        // Expects something like https://test.solid.community/private/tests/
        baseUrl = process.env.TEST_BASE_URL
        baseUrl += baseUrl.endsWith('/') ? '' : '/'
      } catch (e) {
        console.error('Error while setting up the https base url')
        console.error(e)
        throw e
      }
      break

    default:
      throw new Error('Unsupported prefix in getBaseUrl: ' + prefix)
  }

  console.log('baseUrl', baseUrl)
  return baseUrl
}

function createTestFetch (baseUrl, authFetch) {
  return async (url, options) => {
    if (!url.startsWith(baseUrl)) {
      throw new Error(`Prevent request to >${url}< because it doesn't start with the base url >${baseUrl}<`)
    }
    const res = await authFetch(url, options)

    return res
  }
}

function assertReady (getter) {
  if (!hasBeenSetup) {
    throw new Error("The context hasn't been set up yet")
  }
  return getter()
}

module.exports = {
  contextSetup,
  prefixes,
  getTestContainer,
  getPrefix: () => prefix,
  getBaseUrl: () => assertReady(() => baseUrl),
  getFetch: () => assertReady(() => testFetch),
  getAuth: () => assertReady(() => auth),
  isReady: () => hasBeenSetup
}
