import auth from 'solid-auth-cli'
import TestFolderGenerator from './TestFolderGenerator'
// cxRes
import libUrl from 'url'

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
 * @callback fetch
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
/**
 * @typedef {object} HttpRequest
 * @property {string} url
 * @property {object} options
 * @property {function} resolve
 * @property {function} reject
 */

const httpRequestsPerSecond = 10
/** @type {HttpRequest[]} */
const httpRequestQueue = []
let httpRequestInterval

/**
 * Setup the testing environment
 * Login the user if required
 */
async function contextSetup () {
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
}

function getTestContainer () {
  if (!testContainer) {
    const { Folder } = TestFolderGenerator
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
      baseUrl = String(libUrl.pathToFileURL(process.cwd()))
      break

    case prefixes.memory:
      baseUrl = prefix
      break

    case prefixes.https:
      try {
        // Due to a bug in combination with jest authentication will be skipped
        // await auth.login()
        if (!process.env.TEST_BASE_URL) {
          throw new Error('Please specify TEST_BASE_URL url if you use the https prefix')
        }
        // Expects something like https://test.solid.community/private/tests/
        // It must be a publicy read and write able folder
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

  return baseUrl
}

/**
 * 
 * @param {string} baseUrl 
 * @param {fetch} authFetch 
 */
function createTestFetch (baseUrl, authFetch) {
  return async (url, options) => {
    if (typeof url !== 'string') {
      throw new Error(`Invalid url passed to test fetch: >${url}<`)
    }
    if (!url.startsWith(baseUrl)) {
      throw new Error(`Prevent request to >${url}< because it doesn't start with the base url >${baseUrl}<`)
    }

    // TODO: Remove this when solid-rest properly adds links
    const fetchWithLinks = async (url, options = {}) => {
      const res = await authFetch(url, options)
      const originalGet = res.headers.get.bind(res.headers)
      let newLinks = res.headers.get('links') || ''
      const baseUrl = (options.method === 'POST' && options.headers.slug)
        ? url + options.headers.slug + (options.headers.link.includes('ontainer') ? '/' : '')
        : url
      if (!newLinks.includes('rel="acl"')) {
        newLinks += `, <${baseUrl}.acl>; rel="acl"`
      }
      if (!newLinks.includes('rel="describedBy"')) {
        newLinks += `, <${baseUrl}.meta>; rel="describedBy"`
      }
      if (newLinks.startsWith(',')) {
        newLinks = newLinks.substr(1)
      }
      res.headers.get = name => {
        const result = name === 'link'
          ? newLinks
          : originalGet(name)
        return result
      }

      return res
    }

    // Limit requests per second for the http environment
    if (prefix !== prefixes.https) {
      return fetchWithLinks(url, options)
    }

    if (!httpRequestInterval) {
      httpRequestInterval = setInterval(async () => {
        const { url, options, resolve, reject } = httpRequestQueue.shift()
        fetchWithLinks(url, options)
          .then(resolve)
          .catch(reject)

        if (!httpRequestQueue.length) {
          httpRequestInterval = clearInterval(httpRequestInterval)
        }
      }, 1000 / httpRequestsPerSecond)
    }

    // Return a promise which waits until it is first in the queue
    return new Promise((resolve, reject) => {
      httpRequestQueue.push({ url, options, resolve, reject })
    })
  }
}

function assertReady (getter) {
  if (!hasBeenSetup) {
    throw new Error("The context hasn't been set up yet")
  }
  return getter()
}

export default {
  contextSetup,
  prefixes,
  getTestContainer,
  getPrefix: () => prefix,
  getBaseUrl: () => assertReady(() => baseUrl),
  getFetch: () => assertReady(() => testFetch),
  getAuth: () => assertReady(() => auth),
  isReady: () => hasBeenSetup
}
