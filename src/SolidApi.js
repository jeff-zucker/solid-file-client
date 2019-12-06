import debug from 'debug'
import apiUtils from './utils/apiUtils'
import FolderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'
import errorUtils from './utils/errorUtils'
import LinksUtils from './utils/linksUtils'

const fetchLog = debug('solid-file-client:fetch')
const { getRootUrl, getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { ComposedFetchError, assertResponseOk, composedFetch, toComposedError } = errorUtils

/**
 * @typedef {Object} WriteOptions
 * @property {boolean} [overwriteFiles=true] replace existing files
 * @property {boolean} [overwriteFolders=false] delete existing folders and their contents
 * @property {boolean} [createPath=true] create parent containers if they don't exist
 * @property {boolean} [copyAcl=true] Unused yet
 * @property {boolean} [copyMeta=true] Unused yet
 */

const defaultWriteOptions = {
  overwriteFiles: true,
  overwriteFolders: false,
  withAcl: true,
  copyMeta: true,
  createPath: true
}

const defaultDeleteOptions = { withAcl: true }

/**
 * @typedef {object} SolidApiOptions
 * @property {boolean|string} [enableLogging=false] set to true to output all logging to the console or e.g. solid-file-client:fetch for partial logs
 */

const defaultSolidApiOptions = {
  enableLogging: false
}

/**
 * @typedef Item
 * @property {string} url
 * @property {string} name
 * @property {string} parent
 * @property {"Container" | "Resource"} itemType
 */

/**
 * @typedef {object} FolderData
 * @property {string} url
 * @property {string} name
 * @property {string} parent
 * @property {"folder"} type
 * @property {Item[]} folders
 * @property {Item[]} files
 */

/**
 * (optionally authenticated) fetch method similar to window.fetch
 * @callback fetch
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */

class SolidAPI {
  /**
   * Provide API methods which use the passed fetch method
   * @param {fetch} fetch
   * @param {SolidApiOptions} [options]
   */
  constructor (fetch, options) {
    options = { ...defaultSolidApiOptions, ...options }
    this._fetch = fetch
    this.processFolder = new FolderUtils().processFolder
    this.rdf = new RdfQuery(this.fetch.bind(this))
    const link = new LinksUtils()
    this.getLinks = link.getLinks
    this.getItemLinks = link.getItemLinks

    if (options.enableLogging) {
      if (typeof options.enableLogging === 'string') {
        debug.enable(options.enableLogging)
      } else {
        debug.enable('solid-file-client:*')
      }
    }
  }

  /**
   * Fetch a resource with the passed fetch method
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>} resolves if response.ok is true, else rejects the response
   * @throws {ComposedFetchError}
   */
  fetch (url, options) {
    return this._fetch(url, options)
      .then(res => {
        fetchLog(`${res.status} - ${options && options.method} ${url}`)
        return res
      })
      .then(assertResponseOk)
  }

  /**
   * Send get request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  get (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'GET'
    })
  }

  /**
   * Send delete request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  delete (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'DELETE'
    })
  }

  /**
   * Send post request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  post (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'POST'
    })
  }

  /**
   * Send put request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  put (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'PUT'
    })
  }

  /**
   * Send patch request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  patch (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'PATCH'
    })
  }

  /**
   * Send head request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  head (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'HEAD'
    })
  }

  /**
   * Send options request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  options (url, options) {
    return this.fetch(url, {
      ...options,
      method: 'OPTIONS'
    })
  }

  /**
   * Check if item exists.
   * Return false if status is 404. If status is 403 (or any other "bad" status) reject.
   * @param {string} url
   * @returns {Promise<boolean>}
   * @example
   * if (await api.itemExists(url)) {
   *   // Do something
   * } else {
   *   // Do something else
   * }
   */
  async itemExists (url) {
    return this.head(url)
      .then(() => true)
      .catch(err => {
        // Only return false when the server returned 404. Else throw
        if (!(err instanceof ComposedFetchError && err.rejected[0].status === 404)) {
          throw err
        }
        return false
      })
  }

  /**
   * Create an item at target url.
   * Per default it will create the parent folder if it doesn't exist.
   * Per default existing items will be replaced.
   * You can modify this default behaviour with the options
   * @param {string} url
   * @param {Blob|string} content
   * @param {string} contentType
   * @param {string} link - header for Container/Resource, see LINK in apiUtils
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  async createItem (url, content, contentType, link, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    const parentUrl = getParentUrl(url)

    if (await this.itemExists(url)) {
      if ((link === LINK.RESOURCE && !options.overwriteFiles) || (link === LINK.CONTAINER && !options.overwriteFolders)) {
        toComposedError(new Error('Item already existed: ' + url))
      }
      await this.delete(url) // TBD: Should we throw here if a folder has contents?
    } else if (options.createPath) {
      await this.createFolder(parentUrl)
    }

    const requestOptions = {
      headers: {
        link,
        slug: getItemName(url),
        'Content-Type': contentType
      },
      body: content
    }

    return this.post(parentUrl, requestOptions)
  }

  /**
   * Create a folder if it doesn't exist.
   * Per default it will resolve when the folder already existed
   * @param {string} url
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} Response of HEAD request if it already existed, else of creation request
   * @throws {ComposedFetchError}
   */
  async createFolder (url, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }

    try {
      // Test if item exists
      const res = await this.head(url)
      if (!options.overwriteFolders) {
        return res
      }
      await this.deleteFolderRecursively(url)
    } catch (e) {
      if (!(e instanceof ComposedFetchError && e.rejected[0].status === 404)) {
        throw e
      }
    }

    return this.createItem(url, '', 'text/turtle', LINK.CONTAINER, options)
  }

  /**
   * Create a new file.
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  createFile (url, content, contentType, options) {
    return this.createItem(url, content, contentType, LINK.RESOURCE, options)
  }

  /**
   * Create a file using PUT
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {ComposedFetchError}
   */
  async putFile (url, content, contentType, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    // Options which are not like the default PUT behaviour
    if (!options.overwriteFiles && await this.itemExists(url)) {
      // TODO: Discuss how this should be thrown
      toComposedError(new Error('File already existed: ' + url))
    }
    if (!options.createPath && !(await this.itemExists(getParentUrl(url)))) {
      // Incosistent with createFile (createFile returns 404 response)
      throw new Error(`Container of ${url} did not exist. Specify createPath=true if it should be created`)
    }

    const requestOptions = {
      headers: {
        link: LINK.RESOURCE,
        slug: getItemName(url),
        'Content-Type': contentType
      },
      body: content
    }

    return this.put(url, requestOptions)
  }

  /**
   * Fetch and parse a folder
   * @param {string} url
   * @returns {Promise<FolderData>}
   * @throws {ComposedFetchError}
   */

  async readFolder (url, options) {
    return this.processFolder(url, options)
  }

  /**
   * Copy a file.
   * Overwrites per default
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} - Response from the new file created
   * @throws {ComposedFetchError}
   */
  async copyFile (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw toComposedError(new Error(`The from and to parameters of copyFile must be strings. Found: ${from} and ${to}`))
    }
    if (from.endsWith('.acl') || from.endsWith('.acl')) {
      throw toComposedError(new Error(`ACL files cannot be copied. Found: ${from} and ${to}`))
    }
    await this._copyFile(from, to, options).catch(toComposedError)
    if (options.withAcl) {
      await this._copyFileAcl(from, to, options).catch(toComposedError)
    }
  }

  async _copyFile (from, to, options) {
    const response = await this.get(from)
    const content = await response.blob()
    const contentType = response.headers.get('content-type')

    return this.putFile(to, content, contentType, options)
  }

  async _copyFileAcl (from, to, options) {
    let acl = await this.getLinks(from, options.withAcl)
    if (acl[0]) {
      let fromAcl = acl[0]
      let toAcl = await this.getItemLinks(to, options.withAcl)
      const response = await this.get(fromAcl.url)
      let content = await response.text()
      // turtle acl content :
      let toName = to.substr(to.lastIndexOf('/') + 1)
      let fromName = from.substr(from.lastIndexOf('/') + 1)
      if (content.includes(from)) {
        // if object values are absolute URI's make them relative to the destination
        content = content.replace(new RegExp('<' + from + '>', 'g'), '<./' + toName + '>')
        content = content.replace(new RegExp('<' + getRootUrl(from) + 'profile/card#me>'), '<./profile/card#me>')
      } else if (toName !== fromName) {
        // if relative replace file destination
        content = content.replace(new RegExp(fromName + '>', 'g'), toName + '>')
      }
      const contentType = response.headers.get('content-type')
      await this.putFile(toAcl.acl, content, contentType, options).catch(toComposedError)
    }
  }

  /**
   * Copy a folder and all contents.
   * Overwrites files per default.
   * Merges folders if already existing
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * The others will be creation responses from the contents in arbitrary order.
   * @throws {ComposedFetchError}
   */
  async copyFolder (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw toComposedError(new Error(`The from and to parameters of copyFolder must be strings. Found: ${from} and ${to}`))
    }
    const { folders, files } = await this.readFolder(from, { withAcl: false }).catch(toComposedError) // toFile.acl build by copyFile and _copyFolder
    const folderResponse = await this._copyFolder(from, to, options).catch(toComposedError)

    const creationResults = await composedFetch([
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options))
    ])

    return [folderResponse].concat(...creationResults) // Alternative to Array.prototype.flat
  }

  /**
   * non recursive copy of a folder with .acl
   * Overwrites files per default.
   * Merges folders if already existing
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * @throws {ComposedFetchError}
   */
  async _copyFolder (from, to, options) {
    await this.createFolder(to, options).catch(toComposedError)
    if (options.withAcl) {
      await this._copyFileAcl(from, to, options).catch(toComposedError)
    }
  }

  /**
   * Copy a file (url ending with file name) or folder (url ending with "/").
   * Overwrites files per default.
   * Merges folders if already existing
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * If it is a folder, the others will be creation responses from the contents in arbitrary order.
   * @throws {ComposedFetchError}
   */
  copy (from, to, options) {
    // TBD: Rewrite to detect folders not by url (ie remove areFolders)
    if (areFolders(from, to)) {
      return this.copyFolder(from, to, options)
    }
    if (areFiles(from, to)) {
      return this.copyFile(from, to, options)
        .then(_responseToArray)
        .catch(toComposedError)
    }

    toComposedError(new Error('Cannot copy from a folder url to a file url or vice versa'))
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   * @throws {ComposedFetchError}
   */
  async deleteFolderContents (url, options) {
    options = { ...defaultDeleteOptions, ...options } // should delete .acl by default for deletefolderRecursively
    const { folders, files } = await this.readFolder(url, options).catch(toComposedError)
    return composedFetch([
      ...folders.map(({ url }) => this.deleteFolderRecursively(url)),
      ...files.map(({ url }) => this.delete(url))
    ])
  }

  /**
   * Delete a folder and its contents recursively
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with an array of deletion responses.
   * The first one will be the folder specified by "url".
   * The others will be the deletion responses from the contents in arbitrary order
   * @throws {ComposedFetchError}
   */
  async deleteFolderRecursively (url) {
    const resolvedResponses = await this.deleteFolderContents(url)
    resolvedResponses.unshift(await this.delete(url).catch(toComposedError))

    return resolvedResponses
  }

  /**
   * Move a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for copying and deleting items
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response[]>} Responses of the newly created items
   * @throws {ComposedFetchError}
   */
  async move (from, to, options) {
    const copyResponse = await this.copy(from, to, options)
    if (areFolders(from)) {
      await this.deleteFolderRecursively(from)
    } else {
      await this.delete(from)
        .then(_responseToArray)
    }
    return copyResponse
  }

  /**
   * Rename a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for moving items within the same directory
   * @param {string} url
   * @param {string} newName
   * @param {RequestOptions} [options]
   * @returns {Promise<Response[]>} Response of the newly created items
   * @throws {ComposedFetchError}
   */
  rename (url, newName, options) {
    const to = getParentUrl(url) + newName + (areFolders(url) ? '/' : '')
    return this.move(url, to, options)
  }
}

/**
 * return the response as array
 * @param {Response} res
 */
function _responseToArray (res) {
  if (Array.isArray(res)) {
    return res
  } else {
    return [ res ]
  }
}

export default SolidAPI
