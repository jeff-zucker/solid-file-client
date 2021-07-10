import debug from 'debug'
import apiUtils from './utils/apiUtils'
import folderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'
import errorUtils from './utils/errorUtils'
import linksUtils from './utils/linksUtils'
import AclParser from './utils/aclParser'

const fetchLog = debug('solid-file-client:fetch')
const { getRootUrl, getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
const { getLinksFromResponse } = linksUtils
const { parseFolderResponse } = folderUtils

/**
 * @typedef {"replace"|"keep_source"|"keep_target"} MERGE
 * @private
 */
export const MERGE = {
  REPLACE: 'replace',
  KEEP_SOURCE: 'keep_source',
  KEEP_TARGET: 'keep_target'
}
/**
 * @typedef {"exclude"|"include"|"include_possible"} LINKS
 * @private
 */
export const LINKS = {
  EXCLUDE: 'exclude',
  INCLUDE: 'include',
  INCLUDE_POSSIBLE: 'include_possible'
}
/**
 * @typedef {"no_modify"|"to_target"|"to_source"} AGENT
 * @private
 */
export const AGENT = {
  NO_MODIFY: 'no_modify',
  TO_TARGET: 'to_target',
  TO_SOURCE: 'to_source'
}

/**
 * @typedef {object} WriteOptions
 * @property {boolean} [createPath=true] create parent containers if they don't exist
 * @property {boolean} [withAcl=true] also copy acl files
 * @property {AGENT} [agent="no_modify"] specify how to handle existing .acl
 * @property {boolean} [withMeta=true] also copy meta files
 * @property {MERGE} [merge="replace"] specify how to handle existing files/folders
 */

const defaultWriteOptions = {
  withAcl: true,
  withMeta: true,
  agent: AGENT.NO_MODIFY,
  merge: MERGE.REPLACE,
  createPath: true
}

/**
 * @typedef {object} ReadFolderOptions
 * @property {LINKS} [links="exclude"]
 */

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
   * constructor adds :
   * - this.rdf methods from RdfQuery
   * - this.acl methods from AclParser
   * @param {fetch} fetch
   * @param {SolidApiOptions} [options]
   */
  constructor (fetch, options) {
    options = { ...defaultSolidApiOptions, ...options }
    this._fetch = fetch
    this.rdf = new RdfQuery(this.fetch.bind(this))
    this.acl = new AclParser()
    this.isValidAcl = this.acl.isValidAcl
    this.isValidRDF = this.acl.isValidRDF
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
   * @param {string} url
   * @param {Blob|string} content
   * @param {string} contentType
   * @param {string} link - header for Container/Resource, see LINK in apiUtils
   * @param {WriteOptions} [options] - only uses createPath option
   * @returns {Promise<Response>}
   */
  async postItem (url, content, contentType, link, options) {
    options = {
      ...({ createPath: true }),
      ...options
    }
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
   */
  async createFolder (url, options) {
    options = {
      ...({ createPath: true, merge: MERGE.KEEP_TARGET }),
      ...options
    }
    if (!url.endsWith('/')) {
      throw toFetchError(new Error(`Cannot use createFolder to create a file : ${url}`))
    }

    try {
      // Test if item exists
      const res = await this.head(url)
      if (options.merge !== MERGE.REPLACE) {
        return res
      }
      await this.deleteFolderRecursively(url)
    } catch (err) {
      assertResponseStatus(404)(err)
    }

    return this.postItem(url, '', 'text/turtle', LINK.CONTAINER, options)
  }

  /**
   * Create a new file.
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   */
  postFile (url, content, contentType, options) {
    if (url.endsWith('/')) {
      throw toFetchError(new Error(`Cannot use postFile to create a folder : ${url}`))
    }
    return this.postItem(url, content, contentType, LINK.RESOURCE, options)
  }

  /**
   * Create a new file.
   * Per default it will overwrite existing files
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
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
   */
  async putFile (url, content, contentType, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (url.endsWith('/')) {
      throw toFetchError(new Error(`Cannot use putFile to create a folder : ${url}`))
    }

    // Options which are not like the default PUT behaviour
    if (options.merge === MERGE.KEEP_TARGET && await this.itemExists(url)) {
      /*
         TBD : is this right???
         The docs define merge.keep_target as
            target becomes target plus items found only in source
         If the item exists in both places it should noop, not fail.
         (2021-06-10,Jeff)
      */ 
      toFetchError(new Error('File already existed: ' + url))
    }

    const requestOptions = {
      headers: {
        link: LINK.RESOURCE,
        'Content-Type': contentType
      },
      body: content
    }

    return this.put(url, requestOptions)
  }

  /**
   * Update a file using PATCH
   * @param {string} url parsable by N3.js
   * @param {String} patchContent
   * @param {string} patchContentType
   * @property {patchContentType} 'text/n3' or 'application/sparql-update'
   * @returns {Promise<Response>}
   */
  async patchFile (url, patchContent, patchContentType) {
    const patchErrors = {
      400: 'Bad PATCH request',
      409: 'Conflict cannot apply PATCH',
      415: 'patchContentType should be "text/n3" or "application/sparql-update"',
      500: 'Probably cannot parse resource with PATCH'
    }
    if (!(patchContentType === 'text/n3' || patchContentType === 'application/sparql-update')) {
      throw toFetchError(new Error(patchErrors[415]))
    }
    // isValid N3 content
    if (patchContentType === 'text/n3') {
      try {
        await this.rdf._parse(patchContent, { format: 'text/n3' })
      } catch (err) { throw toFetchError(new Error('400 : ' + err)) }
    }
    const requestOptions = {
      headers: {
        link: LINK.RESOURCE,
        'Content-Type': patchContentType
      },
      body: patchContent
    }
    try {
      const res = await this.patch(url, requestOptions)
      return res
    } catch (e) {
      e.message = e.status + ' : '
      e.message += patchErrors[e.status] ? patchErrors[e.status] : '' // e.statusText
      throw toFetchError(new Error(e.message))
    }
  }

  /**
   * Fetch and parse a folder
   * @param {string} url
   * @param {ReadFolderOptions} [options]
   * @returns {Promise<FolderData>}
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
      const addItemLinks = async item => { item.links = await this.getItemLinks(item.url, options) }
//console.log(1,await addItemLinks(parsedFolder),options);
      await composedFetch([
        addItemLinks(parsedFolder),
        ...parsedFolder.files.map(addItemLinks)
      ])
    }
    // DON'T LOOK FOR SUBFOLDER LINKS ...parsedFolder.folders.map(addItemLinks)

    return parsedFolder
  }

  /**
   * Get acl and meta links of an item
   * @param {string} url
   * @param {object} [options]
   * - specify if links should be checked for existence or not
   * - may select acl or meta only
   * @returns {Promise<Links>}
   */
  async getItemLinks (url, options) {
    options = {
      links: LINKS.INCLUDE.POSSIBLE,
      withAcl: true,
      withMeta: true,
      ...options
    }
    if (options.links === LINKS.EXCLUDE) {
      toFetchError(new Error('Invalid option LINKS.EXCLUDE for getItemLinks'))
    }

    const links = await this.head(url).then(getLinksFromResponse)
    if (options.links === LINKS.INCLUDE) {
      if (!options.withAcl) delete links.acl
      if (!options.withMeta) delete links.meta
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
   * Per default overwrite existing files and copy links too.
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} - Response from the new file created
   */
  async copyFile (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (from.endsWith('/') || to.endsWith('/')) {
      throw toFetchError(new Error(`Folders are not allowed with copyFile. Found: ${from} and ${to}`))
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
   * Checks that urls for copying a link file are defined,
   * @param {string} from
   * @param {string} to
   * @returns {Promise<boolean>} true if both are defined, else false
   * @throws {FetchError} throws when from is defined and exists, but to is undefined
   * @private
   */
  async _linkUrlsDefined (from, to) {
    if (typeof from !== 'string') {
      return false
    } else if (typeof to !== 'string' && await this.itemExists(from)) {
      throw toFetchError(new Error('Cannot copy link file because target location was not provided by the pod'))
    } else if (typeof to !== 'string') {
      return false
    } else {
      return true
    }
  }

  /**
   * Copy a meta file
   * @param {string} oldTargetFile
   * @param {string} newTargetFile
   * @param {WriteOptions} [options]
   * @returns {Promise<Response|undefined>} creation response
   */
  async copyMetaFileForItem (oldTargetFile, newTargetFile, options = {}) {
    // TODO: Default options?
    const { meta: metaFrom } = await this.getItemLinks(oldTargetFile)
    const { meta: metaTo } = await this.getItemLinks(newTargetFile)
    if (!(await this._linkUrlsDefined(metaFrom, metaTo))) {
      return undefined
    }
    return this.copyFile(metaFrom, metaTo, { withAcl: options.withAcl, withMeta: false })
  }

  /**
   * Copy an ACL file
   * @param {string} oldTargetFile Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl)
   * @param {string} newTargetFile Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl)
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} creation response
   */
  async copyAclFileForItem (oldTargetFile, newTargetFile, options) {
    options = {
      ...defaultWriteOptions,
      ...({ agent: AGENT.NO_MODIFY }),
      ...options
    }

    const { acl: aclFrom } = await this.getItemLinks(oldTargetFile)
    const { acl: aclTo } = await this.getItemLinks(newTargetFile)

    if (!(await this._linkUrlsDefined(aclFrom, aclTo))) {
      return undefined
    }

    const aclResponse = await this.get(aclFrom)
    const contentType = aclResponse.headers.get('Content-Type')
    let content = await aclResponse.text()

    // TODO: Use nodejs url module, make URL and use its host/base/origin/... instead of getRootUrl
    const toName = areFolders(newTargetFile) ? '' : getItemName(newTargetFile)
    content = this.acl.makeContentRelative(content, oldTargetFile, toName, options)

    return this.putFile(aclTo, content, contentType, options)
  }

  /**
   * Copy links for an item. Use withAcl and withMeta options to specify which links to copy
   * Does not throw if the links don't exist.
   * @param {string} oldTargetFile Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl)
   * @param {string} newTargetFile Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl)
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} creation responses
   */
  async copyLinksForItem (oldTargetFile, newTargetFile, options) {
    // TODO: Default options?
    const responses = []
    if (options.withMeta) {
      responses.push(await this.copyMetaFileForItem(oldTargetFile, newTargetFile, options)
        .catch(assertResponseStatus(404)))
    }
    if (options.withAcl) {
      responses.push(await this.copyAclFileForItem(oldTargetFile, newTargetFile, options)
        .catch(assertResponseStatus(404)))
    }
    return responses.filter(res => res && !(res instanceof Error))
  }

  /**
   * Copy a folder and all contents.
   * Per default existing folders will be deleted before copying and links will be copied.
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * The others will be creation responses from the contents in arbitrary order.
   */
  async copyFolder (from, to, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw toFetchError(new Error(`The from and to parameters of copyFolder must be strings. Found: ${from} and ${to}`))
    }
    if (!from.endsWith('/') || !to.endsWith('/')) {
      throw toFetchError(new Error(`Files are not allowed with copyFolder. Found: ${from} and ${to}`))
    }
    const { folders, files } = await this.readFolder(from)
    // "to" cannot be a parent of "from" with options.merge replace
    if (options.merge === MERGE.REPLACE && from.startsWith(to)) {
      throw toFetchError(new Error(`Destination cannot be a parent folder with "options.merge = replace". Found: ${from} and ${to}`))
    }
    const folderResponse = await this.createFolder(to, options)

    await this.copyLinksForItem(from, to, options, undefined, folderResponse)

    const creationResults = await composedFetch([
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options)
        .catch(catchError(err => err.message.includes('already existed')))) // Don't throw when merge=KEEP_TARGET and it tried to overwrite a file
    ]).then(responses => responses.filter(item => !(item instanceof FetchError)))

    return [folderResponse].concat(...creationResults) // Alternative to Array.prototype.flat
  }

  /**
   * Copy a file (url ending with file name) or folder (url ending with "/").
   * Per default existing folders will be deleted before copying and links will be copied.
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * If it is a folder, the others will be creation responses from the contents in arbitrary order.
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
    // atomic delete as been introduced in NSS > 5.2.4
    /* const links = await this.getItemLinks(itemUrl, { links: LINKS.INCLUDE })
    if (links.meta) {
      await this._deleteItemWithLinks(links.meta)
    }
    if (links.acl) {
      await this.delete(links.acl)
    }

    // Note: Deleting item after deleting links to make it work for folders
    //       Change this if a new spec allows to delete them together (to avoid deleting the permissions before the folder)
    */
    return await this.delete(itemUrl)
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   */
  async deleteFolderContents (url) {
    // pod root cannot be deleted recursively
    if (url === getRootUrl(url)) { throw toFetchError(new Error('405 Pod cannot be deleted')) }
    const { folders, files } = await this.readFolder(url,{links:LINKS.INCLUDE})
    return composedFetch([
      ...folders.map(({ url }) => this.deleteFolderRecursively(url)),
      ...files.map(({ url }) => this._deleteItemWithLinks(url))
    ])
  }

  /**
   * Delete a folder, its contents and links recursively
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with an array of deletion responses.
   * The first one will be the folder specified by "url".
   * The others will be the deletion responses from the contents in arbitrary order
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
   * @param {WriteOptions} [copyOptions]
   * @returns {Promise<Response[]>} Responses of the copying
   */
  async move (from, to, copyOptions) {
    const copyResponse = await this.copy(from, to, copyOptions)
    if (areFolders(from)) {
      await this.deleteFolderRecursively(from)
    } else {
      await this._deleteItemWithLinks(from)
    }
    return copyResponse
  }

  /**
   * Rename a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for moving items within the same directory
   * @param {string} url
   * @param {string} newName
   * @param {WriteOptions} [moveOptions]
   * @returns {Promise<Response[]>} Response of the newly created items
   */
  rename (url, newName, moveOptions) {
    const to = getParentUrl(url) + newName + (areFolders(url) ? '/' : '')
    return this.move(url, to, moveOptions)
  }
}

/**
 * @callback fetchErrorChecker
 * @param {FetchError} response
 * @returns {Response}
 * @private
 */

/**
 * create a function that throws if the response has a different status
 * @param {number} status
 * @returns {fetchErrorChecker}
 * @throws {FetchError}
 * @private
 */
function assertResponseStatus (status) {
  return catchError(res => res.status === status)
}

/**
 * create a function that catches a FetchError throws if the callback returns false
 * @param {function} callback
 * @returns {fetchErrorChecker}
 * @throws {FetchError}
 * @private
 */
function catchError (callback) {
  return err => {
    if (!callback(err)) { throw toFetchError(err) }
    return err
  }
}

export default SolidAPI
