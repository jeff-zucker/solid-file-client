import debug from 'debug'
import apiUtils from './utils/apiUtils'
import folderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'
import errorUtils from './utils/errorUtils'
import linksUtils from './utils/linksUtils'

const fetchLog = debug('solid-file-client:fetch')
const { getRootUrl, getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
const { getLinksFromResponse, parseLinkHeader } = linksUtils
const { parseFolderResponse } = folderUtils

export const MERGE = {
  REPLACE: 'replace',
  KEEP_SOURCE: 'source',
  KEEP_TARGET: 'target'
}
export const LINKS = {
  EXCLUDE: 'exludeLinks',
  INCLUDE: 'includeLinks',
  INCLUDE_POSSIBLE: 'includePossibleLinks'
}

/**
 * @typedef {Object} WriteOptions
 * @property {boolean} [createPath=true] create parent containers if they don't exist
 * @property {boolean} [withAcl=true] Unused yet
 * @property {boolean} [withMeta=true] Unused yet
 * @todo Update this
 */

const defaultWriteOptions = {
  withAcl: true,
  withMeta: true,
  merge: MERGE.REPLACE,
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
 * @typedef {object} Links
 * @property {string} [acl]
 * @property {string} [meta]
 */

/**
 * @typedef {object} Item
 * @property {string} url
 * @property {string} name
 * @property {string} parent
 * @property {"Container" | "Resource"} itemType
 * @property {Links} [links]
 */

/**
 * @typedef {object} FolderData
 * @property {string} url
 * @property {string} name
 * @property {string} parent
 * @property {Links} links
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
        assertResponseStatus(404)(err)
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
      ...({ createPath: true, merge: MERGE.KEEP_TARGET }),
      ...options
    }

    try {
      // Test if item exists
      const res = await this.head(url)
      if (options.merge !== MERGE.REPLACE) {
        return res
      }
      await this.deleteFolderRecursively(url)
    } catch (e) {
      assertResponseStatus(404)(e)
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
    if (options.merge === MERGE.KEEP_TARGET && await this.itemExists(url)) {
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
    url = url.endsWith('/') ? url : url + '/'
    options = {
      links: LINKS.EXCLUDE,
      ...options
    }

    const folderRes = await this.get(url, { headers: { Accept: 'text/turtle' } })
    const parsedFolder = await parseFolderResponse(folderRes, url)

    if (options.links === LINKS.INCLUDE_POSSIBLE || options.links === LINKS.INCLUDE) {
      const addItemLinks = async item => item.links = await this.getItemLinks(item.url, options)
      await composedFetch([
        addItemLinks(parsedFolder),
        ...parsedFolder.files.map(addItemLinks),
        ...parsedFolder.folders.map(addItemLinks)
      ])
    }

    return parsedFolder
  }

  /**
   * Get acl and meta links of an item
   * @param {string} url
   * @param {object} [options] specify if links should be checked for existence or not
   * @returns {Promise<Links>}
   */
  async getItemLinks (url, options = { links: LINKS.INCLUDE_POSSIBLE }) {
    if (options.links === LINKS.EXCLUDE) {
      toFetchError(new Error('Invalid option LINKS.EXCLUDE for getItemLinks'))
    }

    const links = await this.head(url).then(getLinksFromResponse)

    if (options.links === LINKS.INCLUDE) {
      await this._removeInexistingLinks(links)
    }

    return links
  }

  /**
   * Remove all links which are not existing of a links object
   * @param {Links} links
   * @returns {Promise<void>}
   * @private
   */
  async _removeInexistingLinks (links) {
    await composedFetch(
      Object.entries(links)
        .map(([type, url]) => this.itemExists(url)
          .catch(assertResponseStatus(404))
          .then(exists => {
            if (!exists) {
              delete links[type]
            }
          })
        )
    )
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
    const getResponse = await this.get(from)
    const content = await getResponse.blob()
    const contentType = getResponse.headers.get('content-type')
    const putResponse = await this.putFile(to, content, contentType, options)

    // Optionally copy ACL and Meta Files
    // TODO: What do we want to do when the source has no acl, but the target has one?
    //       Currently it keeps the old acl.
    await this.copyLinksForItem(from, to, options, getResponse, putResponse)

    return putResponse
  }

  /**
   * Copy a meta file
   * @param {string} oldTargetFile
   * @param {string} newTargetFile
   * @param {WriteOptions} [options]
   * @param {Response} [fromResponse]
   * @param {Response} [toResponse]
   * @returns {Promise<Response>}
   */
  async copyMetaFileForItem (oldTargetFile, newTargetFile, options = {}, fromResponse, toResponse) {
    // TODO: Default options?
    const { meta: metaFrom } = fromResponse ? getLinksFromResponse(fromResponse) : await this.getItemLinks(oldTargetFile)
    const { meta: metaTo } = toResponse ? getLinksFromResponse(toResponse) : await this.getItemLinks(newTargetFile)

    // TODO: Handle not finding of meta links (ie metaFrom/metaTo is undefined)
    //       Possible to try this.getItemLinks again
    //       Else throw (?)

    return this.copyFile(metaFrom, metaTo, { withAcl: options.withAcl, withMeta: false })
  }

  /**
   * Copy an ACL file
   * @param {string} oldTargetFile Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl)
   * @param {string} newTargetFile Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl)
   * @param {WriteOptions} [options]
   * @param {Response} [fromResponse] response of a request to the targeted file (not necessary, reduces the amount of requests)
   * @param {Response} [toResponse] response of a request to the new targeted file (not necessary, reduces the amount of requests)
   * @returns {Promise<Response>}
   */
  async copyAclFileForItem (oldTargetFile, newTargetFile, options, fromResponse, toResponse) {
    // TODO: Default options?
    const { acl: aclFrom } = fromResponse ? getLinksFromResponse(fromResponse) : await this.getItemLinks(oldTargetFile)
    const { acl: aclTo } = toResponse ? getLinksFromResponse(toResponse) : await this.getItemLinks(newTargetFile)

    // TODO: Handle not finding of acl links (same as in copy meta)

    const aclResponse = await this.get(aclFrom)
    const contentType = aclResponse.headers.get('Content-Type')
    let content = await aclResponse.text()

    // TODO: Use nodejs url module, make URL and use its host/base/origin/... instead of getRootUrl
    // Make absolute paths to the same directory relative
    // Update relative paths to the new location
    const fromName = getItemName(oldTargetFile)
    const toName = areFolders(newTargetFile) ? '' : getItemName(newTargetFile)
    if (content.includes(oldTargetFile)) {
      // if object values are absolute URI's make them relative to the destination
      content = content.replace(new RegExp('<' + oldTargetFile + '>', 'g'), '<./' + toName + '>')
      content = content.replace(new RegExp('<' + getRootUrl(oldTargetFile) + 'profile/card#me>'), '</profile/card#me>')
    }
    if (toName !== fromName) {
      // if relative replace file destination
      content = content.replace(new RegExp(fromName + '>', 'g'), toName + '>')
    }

    return this.putFile(aclTo, content, contentType, options)
  }

  /**
   * Copy links for an item. Use withAcl and withMeta options to specify which links to copy
   * Does not throw if the links don't exist.
   * @param {string} oldTargetFile Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl)
   * @param {string} newTargetFile Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl)
   * @param {WriteOptions} [options]
   * @param {Response} [fromResponse] response of a request to the targeted file (not necessary, reduces the amount of requests)
   * @param {Response} [toResponse] response of a request to the new targeted file (not necessary, reduces the amount of requests)
   * @returns {Promise<Response>}
   */
  async copyLinksForItem (oldTargetFile, newTargetFile, options, fromResponse, toResponse) {
    // TODO: Default options?
    if (options.withMeta) {
      await this.copyMetaFileForItem(oldTargetFile, newTargetFile, options, fromResponse, toResponse)
        .catch(assertResponseStatus(404))
    }
    if (options.withAcl) {
      await this.copyAclFileForItem(oldTargetFile, newTargetFile, options, fromResponse, toResponse)
        .catch(assertResponseStatus(404))
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

    const { folders, files } = await this.readFolder(from)
    const folderResponse = await this.createFolder(to, options)

    await this.copyLinksForItem(from, to, options, undefined, folderResponse)

    const creationResults = await composedFetch([
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options)
        .catch(catchError(err => err.message.includes('already existed')))) // Don't throw when merge=KEEP_TARGET and it tried to overwrite a file
    ])

    return [folderResponse].concat(...creationResults.filter(item => !(item instanceof FetchError))) // Alternative to Array.prototype.flat
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
   * Delete a file and its links
   * @param {string} itemUrl 
   * @returns {Promise<Response>} response of the file deletion
   * @private
   */
  async _deleteItemWithLinks (itemUrl) {
    const links = await this.getItemLinks(itemUrl, { links: LINKS.INCLUDE })
    if (links.meta) {
      await this._deleteItemWithLinks(links.meta)
    }
    if (links.acl) {
      await this.delete(links.acl)
    }

    // Note: Deleting item after deleting links to make it work for folders
    //       Change this if a new spec allows it (to avoid deleting the permissions before the folder)
    const res = await this.delete(itemUrl)

    return res
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   * @throws {FetchError}
   */
  async deleteFolderContents (url) {
    const { folders, files } = await this.readFolder(url)
    return composedFetch([
      ...folders.map(({ url }) => this.deleteFolderRecursively(url)),
      ...files.map(({ url }) => this._deleteItemWithLinks(url))
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
    resolvedResponses.unshift(await this._deleteItemWithLinks(url))

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
      await this._deleteItemWithLinks(from)
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
    return [res]
  }
}

/**
 * @callback fetchErrorChecker
 * @param {FetchError} response
 * @returns {Response}
 */

/**
 * create a function that throws if the response has a different status
 * @param {number} status
 * @returns {fetchErrorChecker}
 * @throws {FetchError}
 */
function assertResponseStatus (status) {
  return catchError(res => res.status === status)
}

/**
 * create a function that catches a FetchError throws if the callback returns false
 * @param {function} callback
 * @returns {fetchErrorChecker}
 * @throws {FetchError}
 */
function catchError (callback) {
  return err => {
    if (!callback(err))
     throw toFetchError(err)
    return err
  }
}

export default SolidAPI
