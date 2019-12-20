import debug from 'debug'
import apiUtils from './utils/apiUtils'
import FolderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'
import errorUtils from './utils/errorUtils'
import linksUtils from './utils/linksUtils'

const fetchLog = debug('solid-file-client:fetch')
const { getRootUrl, getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
const { getLinksFromResponse, parseLinkHeader } = linksUtils
const MERGE = {
  REPLACE: 'replace',
  KEEP_SOURCE: 'source',
  KEEP_TARGET: 'target'
}

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
  withAcl: false, // TODO: Set true
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
   * @throws {FetchError}
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
        if (err.status !== 404) {
          throw err
        }
        return false
      })
  }

  async getLinks (url) {
    // TODO: Consider making private and/or remove completely. Currently used in folderUtils
    const res = await this.head(url)
    const links = getLinksFromResponse(res, url)
    const linksArr = []
    if (links.acl && await this.itemExists(links.acl)) {
      linksArr[0] = {
        url: links.acl,
        type: 'text/turtle',
        itemType: 'AccessControl',
        name: getItemName(links.acl),
        parent: getParentUrl(links.acl)
      }
    }
    if (links.meta && await this.itemExists(links.meta)) {
      linksArr[1] =  {
        url: links.meta,
        type: 'text/turtle',
        itemType: 'Metadata',
        name: getItemName(links.meta),
        parent: getParentUrl(links.meta)
      }
    }
    return linksArr
  }

  async getItemLinks (url) {
    return this.head(url).then(getLinksFromResponse)
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
   * @throws {FetchError}
   */
  async postItem (url, content, contentType, link, options = {}) {
    const parentUrl = getParentUrl(url)

    if (options.createPath) {
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
   * @throws {FetchError}
   */
  async createFolder (url, options) {
    options = {
      ...({ createPath: true, overwriteFolders: false }),
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
      if (e.status !== 404) {
        throw e
      }
    }

    return this.postItem(url, '', 'text/turtle', LINK.CONTAINER, options)
  }

  /**
   * Create a new file.
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {FetchError}
   */
  postFile (url, content, contentType, options) {
    return this.postItem(url, content, contentType, LINK.RESOURCE, options)
  }

  /**
   * Create a new file.
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {FetchError}
   */
  createFile (url, content, contentType, options) {
    return this.putFile(url, content, contentType, options)
  }

  /**
   * Create a file using PUT
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   * @throws {FetchError}
   */
  async putFile (url, content, contentType, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }

    // Options which are not like the default PUT behaviour
    if (!options.overwriteFiles && await this.itemExists(url)) {
      // TODO: Discuss how this should be thrown
      toFetchError(new Error('File already existed: ' + url))
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
   * @throws {FetchError}
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
   * @throws {FetchError}
   */
  async copyFile (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (from.endsWith('.acl') || to.endsWith('.acl')) {
      throw toFetchError(new Error(`Use copyAclFile for copying ACL files. Found: ${from} and ${to}`))
    }

    // Copy File
    const getResponse = await this.get(from).catch(toFetchError)
    const content = await getResponse.blob()
    const contentType = getResponse.headers.get('content-type')
    const putResponse = await this.putFile(to, content, contentType, options).catch(toFetchError)

    // Optionally copy ACL File
    if (options.withAcl) {
      await this.copyAclFileForItem(from, to, options, getResponse, putResponse)
    }

    return putResponse
  }

  /**
   * Copy an ACL file
   * @param {string} oldTargetFile Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl)
   * @param {string} newTargetFile Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl)
   * @param {WriteOptions} [options]
   * @param {Response} [fromResponse] response of a request to the targeted file (not necessary, reduces the amount of requests)
   * @param {Response} [toResponse] response of a request to the new targeted file (not necessary, reduces the amount of requests)
   * @todo Exchange absolute paths with relative paths (e.g. accessTo)
   * @todo Make name more describing
   */
  async copyAclFileForItem (oldTargetFile, newTargetFile, options, fromResponse, toResponse) {
    const { acl: aclFrom } = fromResponse ? getLinksFromResponse(fromResponse) : await this.getItemLinks(oldTargetFile) 
    const { acl: aclTo   } = toResponse   ? getLinksFromResponse(toResponse)   : await this.getItemLinks(newTargetFile) 

    const aclResponse = await this.get(aclFrom).catch(toFetchError)
    const contentType = aclResponse.headers.get('Content-Type')
    let content = await aclResponse.text()

    // TODO: Check if this modification is good enough or replace with something different
    // Make absolute paths to the same directory relative
    // Update relative paths to the new location
    const toName = getItemName(oldTargetFile)
    const fromName = getItemName(newTargetFile)
    if (content.includes(oldTargetFile)) {
      // if object values are absolute URI's make them relative to the destination
      content = content.replace(new RegExp('<' + oldTargetFile + '>', 'g'), '<./' + toName + '>')
      content = content.replace(new RegExp('<' + getRootUrl(oldTargetFile) + 'profile/card#me>'), '<./profile/card#me>')
    } else if (toName !== fromName) {
      // if relative replace file destination
      content = content.replace(new RegExp(fromName + '>', 'g'), toName + '>')
    }

    return this.putFile(to, content, contentType, options).catch(toFetchError)
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
   * @throws {FetchError}
   */
  async copyFolder (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw toFetchError(new Error(`The from and to parameters of copyFolder must be strings. Found: ${from} and ${to}`))
    }
    const { folders, files } = await this.readFolder(from, { withAcl: false }).catch(toFetchError) // toFile.acl build by copyFile and _copyFolder
    const folderResponse = await this._copyFolder(from, to, options).catch(toFetchError)

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
   * @throws {FetchError}
   */
  async _copyFolder (from, to, options) {
    const folderRes = await this.createFolder(to, options).catch(toFetchError)
    if (options.withAcl) {
      await this.copyAclFileForItem(from, to, options, undefined, folderRes).catch(toFetchError)
    }
    return folderRes
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
   * @throws {FetchError}
   */
  copy (from, to, options) {
    // TBD: Rewrite to detect folders not by url (ie remove areFolders)
    if (areFolders(from, to)) {
      return this.copyFolder(from, to, options)
    }
    if (areFiles(from, to)) {
      return this.copyFile(from, to, options)
    }

    toFetchError(new Error('Cannot copy from a folder url to a file url or vice versa'))
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   * @throws {FetchError}
   */
  async deleteFolderContents (url, options) {
    options = { ...defaultDeleteOptions, ...options } // should delete .acl by default for deletefolderRecursively
    const { folders, files } = await this.readFolder(url, options).catch(toFetchError)
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
   * @throws {FetchError}
   */
  async deleteFolderRecursively (url) {
    const resolvedResponses = await this.deleteFolderContents(url)
    resolvedResponses.unshift(await this.delete(url).catch(toFetchError))

    return resolvedResponses
  }

  /**
   * Move a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for copying and deleting items
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response[]>} Responses of the newly created items
   * @throws {FetchError}
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
   * @throws {FetchError}
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
