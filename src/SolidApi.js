import debug from 'debug'
import apiUtils from './utils/apiUtils'
import folderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'
import errorUtils from './utils/errorUtils'

const fetchLog = debug('solid-file-client:fetch')
const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { _parseLinkHeader, _urlJoin } = folderUtils
const { FetchError, ComposedFetchError, assertResponseOk, composedFetch, toComposedError } = errorUtils

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
        if (!(err instanceof FetchError && err.response.status === 404))
          throw err
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
   * @throws {FetchError|Error}
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
   * @throws {FetchError|Error}
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
      if (!(e instanceof FetchError && e.response.status === 404)) {
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
   * @throws {FetchError|Error}
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
   * @throws {FetchError|Error}
   */
  async putFile (url, content, contentType, options) {
    options = {
      ...defaultWriteOptions,
      ...options
    }
    // Options which are not like the default PUT behaviour
    if (!options.overwriteFiles && await this.itemExists(url)) {
      // TODO: Discuss how this should be thrown
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
   * @throws {FetchError}
   */
/*  async readFolder (url, options) {
    return this.processFolder(url, options)
  }
*/
  /**
   * Copy a file.
   * Overwrites per default
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} - Response from the new file created
   * @throws {FetchError|Error}
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
   * @throws {ComposedFetchError}
   */
  async copyFolder (from, to, options) {
    if (typeof from !== 'string' || typeof to !== 'string') {
      throw new Error(`The from and to parameters of copyFile must be strings. Found: ${from} and ${to}`)
    }
    const { folders, files } = await this.readFolder(from, options).catch(toComposedError)
    const folderResponse = await this.createFolder(to, options).catch(toComposedError)

    const creationResults = await composedFetch([
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options))
    ])

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

    throw new Error('Cannot copy from a folder url to a file url or vice versa')
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   * @throws {ComposedFetchError}
   */
async deleteFolderContents (url, options) {
	options = { ...defaultDeleteOptions, ...options }  // should delete .acl by default for deletefolderRecursively
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

  // TBD: Move this code inside readFolder?
  // TBD: Update this comment when the withLinks PR is merged
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
   * processFolder (withAcl=false)
   *   _processStatements
   *   _packageFolder
   * processFolder (withAcl=true)
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
   * @returns {Promise<FolderData>}
   */
  async readFolder (folderUrl, options = { withAcl: false }) {
    if (!folderUrl.endsWith('/')) folderUrl = folderUrl + '/'
    let [rdf, folder, folderItems, fileItems] = [this.rdf, [], [], []] // eslint-disable-line no-unused-vars
    // For folders always add to fileItems : .meta file and if options.withAcl === true also add .acl linkFile
    fileItems = fileItems.concat(await this._getFolderLinks(folderUrl, options.withAcl))
    let files = await rdf.query(folderUrl, { thisDoc: '' }, { ldp: 'contains' })
    for (var f in files) {
      let thisFile = files[f].object
      let thisFileStmts = await rdf.query(null, thisFile)
      let itemRecord = this._processStatements(thisFile.value, thisFileStmts)
      if (itemRecord.itemType.match('Container')) {
        itemRecord.type = 'folder'
        folderItems = folderItems.concat(itemRecord)
      }else {
        fileItems = fileItems.concat(itemRecord)
        // add fileLink acl
		if (options.withAcl) {
          fileItems = fileItems.concat(await this._getFileLinks(thisFile.value, options.withAcl))
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
  // TBD: What type are the items in the stmts array?
  /**
   * @private
   * @param {string} url
   * @param {any[]} stmts
   * @returns {Item}
   */
  _processStatements (url, stmts) {
    const ianaMediaType = 'http://www.w3.org/ns/iana/media-types/'
    const processed = { url: url }
    stmts.forEach(stm => {
      const predicate = stm.predicate.value.replace(/.*\//, '').replace(/.*#/, '')
      let object = stm.object.value.match(ianaMediaType) ? stm.object.value.replace(ianaMediaType, '') : stm.object.value.replace(/.*\//, '')
      if (!predicate.match('type')) object = object.replace(/.*#/, '')
      else if (object !== "ldp#Resource" && object !== "ldp#Container") {
        processed[predicate] = [ ...(processed[predicate] || []), object.replace('#Resource', '') ]   // keep only contentType and ldp#BasicContainer
      }
    })
    for (const key in processed) {
      if (processed[key].length === 1) processed[key] = processed[key][0]
    }
    if (processed.type === undefined) processed['type'] = 'application/octet-stream'
    processed['itemType'] = processed.type.includes('ldp#BasicContainer')
      ? 'Container'
      : 'Resource'
    processed.name = getItemName(url)
    processed.parent = getParentUrl(url)
    return processed
  }

  // TBD: Remove outdated comments
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
    /** @type {FolderData} */
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
  async _getFolderLinks (folderUrl, linkAcl) {
    let folder = await this.getLinks(folderUrl, linkAcl)
    return folder
  }

  /**
   * @private
   * _geFileLinks (TBD)
   */
  async _getFileLinks (itemUrl, linkAcl) {
    let itemWithLinks = await this.getLinks(itemUrl, linkAcl)
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
  async getLinks (itemUrl, linkAcl) {
	let itemLinks = []
	// don't getLinks for .acl files
	if (itemUrl.endsWith('.acl')) return []
    let res = await this.fetch(itemUrl, { method: 'HEAD' })
    let linkHeader = await res.headers.get('link')
	// linkHeader is null for index.html ??
    if (linkHeader === null) return []
    // get .meta, .acl links
	let links = await this._findLinksInHeader(itemUrl, linkHeader, linkAcl)
	if (links.acl) itemLinks = itemLinks.concat(links.acl)
	if (links.meta) {
		itemLinks = itemLinks.concat(links.meta)
		// get .meta.acl link
	    links.metaAcl = await this.getLinks(links.meta.url, linkAcl)
	    if (links.metaAcl) itemLinks = itemLinks.concat(links.metaAcl)
    }
    return itemLinks
  }

  /**
   * @private
   * findLinksInHeader (TBD)
   *
   */
  async _findLinksInHeader (originalUri, linkHeader, linkAcl) {
    let matches = _parseLinkHeader(linkHeader, originalUri)
    let final = {}
    for (let i = 0; i < matches.length; i++) {
      let split = matches[i].split('>')
      let href = split[0].substring(1)
      if (linkAcl && matches[i].match(/rel="acl"/)) { final.acl = await this._lookForLink('AccessControl', href, originalUri) }
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
   * @param {string} linkUrl
   * @param {string} contentType
   * @param {"AccessControl"|"Metadata"} linkType
   * @returns {LinkObject}
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
