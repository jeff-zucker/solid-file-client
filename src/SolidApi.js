// import { getParentUrl, getItemName, areFolders, areFiles, LINK } from './utils/apiUtils'
import debug from 'debug'
import apiUtils from './utils/apiUtils'
import folderUtils from './utils/folderUtils'
import RdfQuery from './utils/rdf-query'

const fetchLog = debug('solid-file-client:fetch')
const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { _parseLinkHeader, _urlJoin } = folderUtils

/**
 * @typedef {Object} WriteOptions
 * @property {boolean} [overwriteFiles=true]
 * @property {boolean} [overwriteFolders=false]
 * @property {boolean} [copyAcl=true]
 * @property {boolean} [copyMeta=true]
 * @property {boolean} [createPath=true]
 */
/** @type WriteOptions */
const defaultWriteOptions = {
  overwriteFiles: true,
  overwriteFolders: false,
  copyAcl: true,
  copyMeta: true,
  createPath: true
}

class SolidAPI {
  /**
   * Provide API methods which use the passed fetch method
   * @param {function(string, Object): Promise<Response>} fetch - (optionally authenticated) fetch method similar to window.fetch
   * @example
   * const auth = require('solid-auth-client').auth
   * const SolidApi = require('solid-auth-api')
   * const api = new SolidApi(auth.fetch.bind(auth))
   * await auth.login(...)
   * api.createFolder('https:/.../foo/bar/')
   *   .then(response => console.log(`Created: ${response.url}`))
   */
  constructor (fetch) {
    this._fetch = fetch
    this.rdf = new RdfQuery(fetch)
  }

  /**
   * Fetch a resource with the passed fetch method
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
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
      method: 'GET',
      ...options
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
      method: 'DELETE',
      ...options
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
      method: 'POST',
      ...options
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
      method: 'PUT',
      ...options
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
      method: 'PATCH',
      ...options
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
      method: 'HEAD',
      ...options
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
      method: 'OPTIONS',
      ...options
    })
  }

  /**
   * Check if item exists
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async itemExists (url) {
    return this.head(url)
      .then(() => true)
      .catch(() => false)
  }

  /**
   * Create an item at target url
   * Per default it will create the parent folder if it doesn't exist
   * Per default existing items will be replaced
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
      await this.delete(url) // TODO: Should we throw here if a folder has contents?
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
   * Create a folder if it doesn't exist
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
   * Create a new file
   * @param {string} url
   * @param {Blob|String} content
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>}
   */
  createFile (url, content, contentType, options) {
    return this.createItem(url, content, contentType, LINK.RESOURCE, options)
  }

  /**
   * Fetch and parse a folder
   * @param {string} url
   * @returns {FolderData}
   */
  async readFolder (url) {
    try {
//      const res = await this.processFolder(url)
//      return res

      const res = await this.processFolder(url)
      return {
        ok: true,
        status: 200,
        body: res
      }

    } catch (e) {
      throw (e)
    }
  }

  /**
   * Copy a file
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response>} - Response from the new file created
   */
  async copyFile (from, to, options) {
    const response = await this.get(from)
    const content = await response.blob()
    const contentType = response.headers.get('content-type')

    return this.createFile(to, content, contentType, options)
  }

  /**
   * Copy a folder and all contents
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * The others will be creation responses from the contents in arbitrary order.
   */
  async copyFolder (from, to, options) {
    const { body: { folders, files } } = await this.readFolder(from)
    const folderResponse = await this.createFolder(to, options) // TODO: Consider separating into overwriteFiles and overwriteFolders

    const promises = [
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, options)),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, options))
    ]

    const creationResults = await Promise.all(promises)

    return [folderResponse].concat(...creationResults) // Alternative to Array.prototype.flat
  }

  /**
   * Copy a file (url ending with file name) or folder (url ending with "/")
   * @param {string} from
   * @param {string} to
   * @param {WriteOptions} [options]
   * @returns {Promise<Response[]>} Resolves with an array of creation responses.
   * The first one will be the folder specified by "to".
   * If it is a folder, the others will be creation responses from the contents in arbitrary order.
   */
  copy (from, to, options) {
    // TODO: Rewrite to detect folders not by url (ie remove areFolders)
    if (areFolders(from, to)) {
      return this.copyFolder(from, to, options)
    }
    if (areFiles(from, to)) {
      return this.copyFile(from, to, options)
        .then(res => [ res ])
    }

    throw new Error('Cannot copy from a folder url to a file url or vice versa')
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   */
  async deleteFolderContents (url) {
    const { body: { folders, files } } = await this.readFolder(url)

    const deletionResults = await Promise.all([
      ...folders.map(async ({ url: folderUrl }) => this.deleteFolderRecursively(folderUrl)),
      ...files.map(async ({ url: fileUrl }) => this.delete(fileUrl))
    ])

    return [].concat(deletionResults) // Flatten array
  }

  /**
   * Delete a folder and its contents recursively
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with an array of deletion responses.
   * The first one will be the folder specified by "url".
   * The others will be the deletion responses from the contents in arbitrary order.
   */
  async deleteFolderRecursively (url) {
    const resolvedResponses = []
    resolvedResponses.push(...(await this.deleteFolderContents(url)))
    resolvedResponses.unshift(await this.delete(url))

    return resolvedResponses
  }

  /**
   * Move a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for copying and deleting items
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Response of the new item created
   */
  async move (from, to, options) {
    const copyResponse = await this.copy(from, to, options)
    await this.delete(from)
    return copyResponse
  }

  /**
   * Rename a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for moving items within the same directory
   * @param {string} url
   * @param {string} newName
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Response of the new item created
   */
  rename (url, newName, options) {
    const to = getParentUrl(url) + newName + (areFolders(url) ? '/' : '')
    return this.move(url, to, options)
  }

  /**
   * Throw error if response.ok is set to false
   * @param {Response} response
   * @returns {Reponse} same response
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
  async processFolder (folderUrl,options={withLinks:false}) {
    let [rdf,folder,folderItems,fileItems] = [this.rdf,[],[],[]]
    if(options.withLinks){
      fileItems.push( _getFolderLinks(folderUrl) )
    }
    let files  = await rdf.query( folderUrl, {thisDoc:''}, {ldp:'contains'} )
    for (var f in files) {
      let thisFile = files[f].object
      let thisFileStmts = await rdf.query(null,thisFile)
      let itemRecord = this._processStatements(thisFile.value,thisFileStmts)
      if(options.withLinks) {
        itemRecord = _getFileLinks(thisFile.value,itemRecord)
      }
      if (itemRecord.itemType.match('Container')) {
        folderItems = folderItems.concat(itemRecord)
      } else { fileItems = fileItems.concat(itemRecord) }
    }
    return this._packageFolder(folderUrl,folderItems,fileItems)
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
   *  - creates arrays for properties that have multiple values (e.g. types)
   *  - stores "type" property in types because v0.x of sfc needs type
   * returns an associative array of the item's properties
   */
  _processStatements (url,stmts) {
    let processed = {url:url}
    stmts.forEach(stm => {
      let predicate=stm.predicate.value.replace(/.*\//,'').replace(/.*#/,'')
      let object = stm.object.value.replace(/.*\//,'')
      if(!predicate.match("type")) object = object.replace(/.*#/,'')
      if(processed[predicate]) processed[predicate].push( object )
      else processed[predicate] = [ object ]
    })
    for(var key in processed){
      if( processed[key].length===1 ) processed[key] = processed[key][0]
    }
    processed["itemType"] = processed.type.includes("ldp#BasicContainer") 
      ? "Container"
      : "Resource"
    return processed
  }

  /*
   * _packageFolder
   *
   * input  : folder's URL, arrays of folders and files it contains
   * output : the hash expected by the end_user of readFolder
   *          as shown in the existing documentation
   */
  _packageFolder(folderUrl,folderItems,fileItems) {
    /* TBD : replace this with Otto's parent method 
    */
    const fullName = folderUrl.replace(/\/$/, '')
    const name = fullName.replace(/.*\//, '')
    const parent = fullName.substr(0, fullName.lastIndexOf('/')) + '/'
    let returnVal = {}
    returnVal.type = 'folder' // for backwards compatability :-(
    returnVal.name = name
    returnVal.parent = parent
    returnVal.url = folderUrl
    returnVal.folders = folderItems
    returnVal.files = fileItems
    // returnVal.content,     // thinking of not sending the turtle
    return returnVal
  }

  /*
   * _geFolderLinks (TBD)
   */
  async _getFolderLinks(folderUrl){
    let folder = await this.getLinks(folderUrl)
    folder[0] = Object.assign(folder[0],
      this._processStatements(await rdf.query(null, { thisDoc: '' })) || {}
    )
    return folder
  }

  /*
   * _geFileLinks (TBD)
   */
  async _getFileLinks(itemUrl,itemRecord){
    let itemWithLinks = await this.getLinks(itemUrl)
    itemWithLinks[0] = Object.assign( itemWithLinks[0], itemRecord )
    return itemWithLinks
  }

  /**
   * getLinks (TBD)
   *
   * returns an array of records related to an item (resource or container)
   *   0   : the item itself
   *   1-3 : the .acl, .meta, and .meta.acl for the item if they exist
   * each record includes these fields (see _getLinkObject)
   *   url
   *   type (one of Container, Resource, AccessControl, or Metadata)
   *   content-type (text/turtle, etc.)
   */
  async getLinks (itemUrl) {
    let res = await this.fetch(itemUrl, { method: 'HEAD' })
    let linkHeader = await res.headers.get('link')
    let links = await this._findLinksInHeader(itemUrl,linkHeader)
    let itemLinks = [ this._getLinkObject(
      links.itemType,itemUrl,res.headers.get('content-type')
    )]
    if (links.acl) itemLinks.push(links.acl)
    if (links.meta) itemLinks.push(links.meta)
    if (links.metaAcl) itemLinks.push(links.metaAcl)
    return itemLinks
  }

  /**
   * findLinksInHeader (TBD)
   *
   */
  async _findLinksInHeader (originalUri,linkHeader ) {
    let matches = _parseLinkHeader(linkHeader, originalUri)
    let final = {}
    for (let i = 0; i < matches.length; i++) {
      let split = matches[i].split('>')
      let href = split[0].substring(1)
      if(matches[i].match(/rel="acl"/)) 
        final.acl = await this._lookForLink("AccessControl",href,originalUri)
      if (matches[i].match(/rel="describedBy"/)) {
        final.meta = await this._lookForLink("Metadata",href,originalUri)
/*
      if(typeof final.meta !="undefined") {
        let metaAcl = this._lookForLink(
          "AccessControl",final.meta.url,".acl"
        )
        if (metaAcl) final.metaAcl = metaAcl
      }
*/
    }
    if (matches[i].match(/rel="type"/))
      final.itemType = href.match('Resource') ? 'Resource' : 'Container'
    }
    return final
  }
  
  /**
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
  async _lookForLink(linkType,itemUrl,linkRelativeUrl){
    let linkUrl = _urlJoin(linkRelativeUrl,itemUrl)
    try { 
      let res = await this.fetch( linkUrl, { method: 'HEAD' }) 
      if (typeof res !== 'undefined' && res.ok) {
        let contentType = res.headers.get("content-type")
        return this._getLinkObject(linkUrl,linkType,contentType)
      }
    } catch (e) {} // ignore if not found
  }

  /**
   * _getLinkObject (TBD)
   *
   * creates a link object for a container or any item it holds
   * type is one of Resource, Container, AccessControl, Metatdata
   * content-type is from the link's header
   */
  _getLinkObject(linkUrl,linkType,contentType){
    return {
      url: linkUrl,
      type: linkType,
      'content-type': contentType
    }
  }

}

export default SolidAPI
