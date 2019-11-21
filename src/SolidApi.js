// import { getParentUrl, getItemName, areFolders, areFiles, LINK } from './utils/apiUtils'
import debug from 'debug'
import apiUtils from './utils/apiUtils'
import promiseUtils from './utils/promiseUtils'
import folderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'

const fetchLog = debug('solid-file-client:fetch')
const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { promiseAllWithFlattenedErrors } = promiseUtils
const { _parseLinkHeader, _urlJoin } = folderUtils

/**
 * @typedef {Object} WriteOptions
 * @property {boolean} [overwriteFiles=true] - replace existing files
 * @property {boolean} [overwriteFolders=false] - delete existing folders and their contents
 * @property {boolean} [createPath=true] - create parent containers if they don't exist
 * @property {boolean} [copyAcl=true] - Unused yet
 * @property {boolean} [copyMeta=true] - Unused yet
 */
/** @type WriteOptions */
const defaultWriteOptions = {
  overwriteFiles: true,
  overwriteFolders: false,
  copyAcl: true,
  copyMeta: true,
  createPath: true
}

/**
 * @typedef {object} SolidApiOptions
 * @property {boolean|string} [enableLogging=false] - set to true to output all logging to the console or e.g. solid-file-client:fetch for partial logs
 */

const defaultSolidApiOptions = {
  enableLogging: false
}

// TBD: Update this

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

class SolidAPI {
  /**
   * Provide API methods which use the passed fetch method
   * @param {function(string, RequestInit): Promise<Response>} fetch - (optionally authenticated) fetch method similar to window.fetch
   * @param {SolidApiOptions} [options]
   */
  constructor (fetch, options) {
    options = { ...defaultSolidApiOptions, ...options }
    this._fetch = fetch
    this.rdf = new RdfQuery(fetch)

    if (options.enableLogging) {
      if (typeof options.enableLogging === 'boolean') {
        debug.enable('solid-file-client:*')
      } else {
        debug.enable(options.enableLogging)
      }
    }
  }

  /**
   * Fetch a resource with the passed fetch method
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>} - resolves if response.ok is true, else rejects the response
   */
  fetch (url, options) {
    return this._fetch(url, options)
      .then(res => {
        fetchLog(`${res.status} - ${options && options.method} ${url}`)
        return res
      })
      .then(this._assertResponseOk)
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
   * Check if item exists
   * @param {string} url
   * @returns {Promise<boolean>}
   * @example
   * if (await api.itemExists(url)) {
   *   // Do something
   * }
   */
  async itemExists (url) {
    return this.head(url)
      .then(() => true)
      .catch(() => false)
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
   */
  async createItem (url, content, contentType, link, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    const parentUrl = getParentUrl(url)

    if (await this.itemExists(url)) {
      if ((link === LINK.RESOURCE && !options.overwriteFiles) || (link === LINK.CONTAINER && !options.overwriteFolders)) {
        throw new Error('Item already existed: ' + url)
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
      if (e.status !== 404) {
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
   */
  async putFile (url, content, contentType, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    // Options which are not like the default PUT behaviour
    if (!options.overwriteFiles && await this.itemExists(url)) {
      throw new Error('File already existed: ' + url)
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
   */
  async copyFile (from, to, options) {
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw new Error(`The from and to parameters of copyFile must be strings. Found: ${from} and ${to}`)
    }
    const response = await this.get(from)
    const content = await response.blob()
    const contentType = response.headers.get('content-type')

    return this.putFile(to, content, contentType, options)
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
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  async copyFolder (from, to, options) {
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw new Error(`The from and to parameters of copyFile must be strings. Found: ${from} and ${to}`)
    }
    const { folders, files } = await this.readFolder(from, options).catch(responseErrToArray)
    const folderResponse = await this.createFolder(to, options).catch(responseErrToArray)

    const promises = [
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options))
    ]

    const creationResults = await promiseAllWithFlattenedErrors(promises)

    return [folderResponse].concat(...creationResults) // Alternative to Array.prototype.flat
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
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  copy (from, to, options) {
    // TBD: Rewrite to detect folders not by url (ie remove areFolders)
    if (areFolders(from, to)) {
      return this.copyFolder(from, to, options)
    }
    if (areFiles(from, to)) {
      return this.copyFile(from, to, options)
        .then(responseToArray)
        .catch(responseErrToArray)
    }

    throw new Error('Cannot copy from a folder url to a file url or vice versa')
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  async deleteFolderContents (url, options = { withLinks: true }) {  // should delete .acl by default for deletefolderRecursively
    const { folders, files } = await this.readFolder(url, options).catch(responseErrToArray)
    const deletionResults = await promiseAllWithFlattenedErrors([
      ...folders.map(({ url }) => this.deleteFolderRecursively(url)),
      ...files.map(({ url }) => this.delete(url))
    ])

    return [].concat(...deletionResults) // Flatten array
  }

  /**
   * Delete a folder and its contents recursively
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with an array of deletion responses.
   * The first one will be the folder specified by "url".
   * The others will be the deletion responses from the contents in arbitrary order
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  async deleteFolderRecursively (url) {
    const resolvedResponses = await this.deleteFolderContents(url)
    resolvedResponses.unshift(await this.delete(url).catch(responseErrToArray))

    return resolvedResponses
  }

  /**
   * Move a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for copying and deleting items
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response[]>} Responses of the newly created items
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  async move (from, to, options) {
    const copyResponse = await this.copy(from, to, options)
    if (areFolders(from)) {
      await this.deleteFolderRecursively(from)
    } else {
      await this.delete(from)
        .then(responseToArray)
        .catch(responseErrToArray)
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
   * @throws {Response[]|Error} if one or more fetch requests failed an array of the responses.
   */
  rename (url, newName, options) {
    const to = getParentUrl(url) + newName + (areFolders(url) ? '/' : '')
    return this.move(url, to, options)
  }

  /**
   * Throw error if response.ok is set to false
   * @private
   * @param {Response} response
   * @returns {Response} same response
   * @throws {Response}
   */
  _assertResponseOk (response) {
    if (!response.ok) {
      throw response
    }
    return response
  }

  /**
   * processFolder
   *
   * TBD :
   *   - refactor all of the links=true methods (not ready yet)
   *   - re-examine parseLinkHeader, return its full rdf
   *   - re-examine error checking in full chain
   *   - complete documentation of methods
   *
   * here's the current call stack
   *
   * processFolder (withLinks=false)
   *   _processStatements
   *   _packageFolder
   * processFolder (withLinks=true)
   *   _getFolderLinks
   *   _getFileLinks
   *     getLinks
   *       _findLinksInHeader
   *         _lookForLink
   *           _getLinkObject
   *
   * returns the same thing the old solid-file-client did except
   *   a) .acl and .meta files are included in the files array *if they exist*
   *   b) additional fields such as content-type are added if available
   *   c) it no longer returns the turtle representation
   *
   * parses a folder's turtle, developing a list of its contents
   * by default, finds associated .acl and .meta
   *
   */
  /**
   * @private // We don't need two public readFolder methods?
   * @param {string} folderUrl
   * @param {object} [options]
   * @returns {FolderData}
   */
  async processFolder (folderUrl, options = { withLinks: false }) {
    if (!folderUrl.endsWith('/')) folderUrl = folderUrl + '/'

    let [rdf, folder, folderItems, fileItems] = [this.rdf, [], [], []] // eslint-disable-line no-unused-vars
    if (options.withLinks) {
      fileItems = fileItems.concat(await this._getFolderLinks(folderUrl))
    }
    let files = await rdf.query(folderUrl, { thisDoc: '' }, { ldp: 'contains' })
    for (var f in files) {
      let thisFile = files[f].object
      let thisFileStmts = await rdf.query(null, thisFile)
      let itemRecord = this._processStatements(thisFile.value, thisFileStmts)
      if (itemRecord.itemType.match('Container')) {
        itemRecord.type = "folder"
        folderItems = folderItems.concat(itemRecord)
      }else {
        fileItems = fileItems.concat(itemRecord)
      // TBD: Add when the discussion about this has finished
		if (options.withLinks) {
          fileItems = fileItems.concat(await this._getFileLinks(thisFile.value, itemRecord))
        }
      }
    }
    return this._packageFolder(folderUrl, folderItems, fileItems)
  }

  /*
   * _processStatements
   *
   * input
   *  - item URL
   *  - statements from the container's turtle with this item as subject
   * finds properties of an item from its predicates and objects
   *  - e.g. predicate = stat#size  object = 4096
   *  - strips off full URLs of predicates and objects
   *  - stores "type" property in types because v0.x of sfc needs type
   * returns an associative array of the item's properties
   */
  // TBD: Update type declaration
  /**
   * @private
   * @param {string} url
   * @param {any} stmts
   * @returns {Item}
   */
  _processStatements (url, stmts) {
	let ianaMediaType = "http://www.w3.org/ns/iana/media-types/"
    let processed = { url: url }
    stmts.forEach(stm => {
      let predicate = stm.predicate.value.replace(/.*\//, '').replace(/.*#/, '')
      let object = stm.object.value.match(ianaMediaType) ? stm.object.value.replace(ianaMediaType, '') : stm.object.value.replace(/.*\//, '')
      if (!predicate.match('type')) object = object.replace(/.*#/, '')
      else if (object !== "ldp#Resource" && object !== "ldp#Container") {
        processed[predicate] = [ ...(processed[predicate] || []), object.replace('#Resource', '') ]   // keep only contentType and ldp#BasicContainer
      }
    })
    for (var key in processed) {
      if (processed[key].length === 1) processed[key] = processed[key][0]
    }
    if ( processed.type === undefined ) processed["type"] = "application/octet-stream"
    processed['itemType'] = processed.type.includes('ldp#BasicContainer')
      ? 'Container'
      : 'Resource'
    processed.name = getItemName(url)
    processed.parent = getParentUrl(url)
    return processed
  }

  /*
   * _packageFolder
   *
   * input  : folder's URL, arrays of folders and files it contains
   * output : the hash expected by the end_user of readFolder
   *          as shown in the existing documentation
   */
  /**
   * @private
   * @param {string} folderUrl
   * @param {Item[]} folderItems
   * @param {Item[]} fileItems
   * @returns {FolderData}
   */
  _packageFolder (folderUrl, folderItems, fileItems) {
    /*
    const fullName = folderUrl.replace(/\/$/, '')
    const name = fullName.replace(/.*\//, '')
    const parent = fullName.substr(0, fullName.lastIndexOf('/')) + '/'
*/
    let returnVal = {}
    returnVal.type = 'folder' // for backwards compatability :-(
    returnVal.name = getItemName(folderUrl)
    returnVal.parent = getParentUrl(folderUrl)
    returnVal.url = folderUrl
    returnVal.folders = folderItems
    returnVal.files = fileItems
    // returnVal.content,     // thinking of not sending the turtle
    return returnVal
  }

  /**
   * @private
   * _geFolderLinks (TBD)
   */
  async _getFolderLinks (folderUrl) {
    let folder = await this.getLinks(folderUrl)
    return folder
  }

  /**
   * @private
   * _geFileLinks (TBD)
   */
  async _getFileLinks (itemUrl, itemRecord) {
    let itemWithLinks = await this.getLinks(itemUrl)
    return itemWithLinks
  }

  /**
   * @private // For now
   * getLinks (TBD)
   *
   * returns an array of records related to an item (resource or container)
   *   0-2 : the .acl, .meta, and .meta.acl for the item if they exist
   * each record includes these fields (see _getLinkObject)
   *   url
   *   type (contentType)
   *   itemType ((AccessControl, or Metadata))
   *   name
   *   parent
   */
  async getLinks (itemUrl) {
    let res = await this.fetch(itemUrl, { method: 'HEAD' })
    let linkHeader = await res.headers.get('link')
	let itemLinks = []
	// linkHeader is null for index.html ??
    if (linkHeader !== null) {
	    let links = await this._findLinksInHeader(itemUrl, linkHeader)
		if (links.acl) itemLinks = itemLinks.concat(links.acl)
	    if (links.meta) {
	        itemLinks = itemLinks.concat(links.meta)
	        links.metaAcl = await this.getLinks(links.meta.url)
	        if (links.metaAcl) itemLinks = itemLinks.concat(links.metaAcl)
        }
    }
    return itemLinks
  }

  /**
   * @private
   * findLinksInHeader (TBD)
   *
   */
  async _findLinksInHeader (originalUri, linkHeader) {
    let matches = _parseLinkHeader(linkHeader, originalUri)
    let final = {}
    for (let i = 0; i < matches.length; i++) {
      let split = matches[i].split('>')
      let href = split[0].substring(1)
      if (matches[i].match(/rel="acl"/)) { final.acl = await this._lookForLink('AccessControl', href, originalUri) }
      // .meta only for folders
      if (originalUri.endsWith('/') && matches[i].match(/rel="describedBy"/)) {
        final.meta = await this._lookForLink('Metadata', href, originalUri)
      }
    }
    return final
  }

  /**
   * @private
   * _lookForLink (TBD)
   *
   * - input
   *     - linkType = one of AccessControl or Metatdata
   *     - itemUrl  = address of the item associated with the link
   *     - relative URL from the link's associated item's header (e.g. .acl)
   * - creates an absolute Url for the link
   * - looks for the link and, if found, returns a link object
   * - else returns undefined
   */
  async _lookForLink (linkType, linkRelativeUrl, itemUrl) {
    let linkUrl = _urlJoin(linkRelativeUrl, itemUrl)
    try {
      let res = await this.fetch(linkUrl, { method: 'HEAD' })
      if (typeof res !== 'undefined' && res.ok) {
        let contentType = res.headers.get('content-type')
        return this._getLinkObject(linkUrl, linkType, contentType, itemUrl)
      }
    } catch (e) {} // ignore if not found
  }

  /**
   * @private
   * _getLinkObject (TBD)
   *
   * creates a link object for a container or any item it holds
   * type is one of AccessControl, Metatdata
   * content-type is from the link's header
   */
  _getLinkObject (linkUrl, linkType, contentType, itemUrl) {
    return {
      url: linkUrl,
      type: contentType,
      itemType: linkType,
      name: getItemName(linkUrl),
      parent: getParentUrl(linkUrl)
    }
  }
}

/**
 * If the error is a response, it will be rethrown as an array
 * @param {Response|Error} err 
 */
function responseErrToArray(err) {
  if (err instanceof Error || !err.status || !err.statusText) {
    throw err
  } else {
    throw [ err ]
  }
}

/**
 * return the response as array
 * @param {Response} res 
 */
function responseToArray(res) {
  if (Array.isArray(res)) {
    return res
  } else {
    return [ res ]
  }
}

export default SolidAPI
