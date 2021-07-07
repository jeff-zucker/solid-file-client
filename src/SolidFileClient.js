import SolidApi from './SolidApi'
import apiUtils from './utils/apiUtils'
import errorUtils from './utils/errorUtils'
import JSZip from 'jszip'
import * as mime from 'mime'
// import { Blob } from 'cross-fetch'

const { getRootUrl, getParentUrl, getItemName } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils

/**
 * @typedef {object} zipOptions
 * - .acl write parameters
 * @property {boolean} [createPath=true] create parent containers if they don't exist
 * @property {LINKS} [links="include"]
 * @property {boolean} [withAcl=true] also copy acl files
 * @property {boolean} [withMeta=true] also copy meta files
 */
const zipOptions = {
  links: 'include',
  withAcl: true,
  withMeta: true
}

/**
 * @typedef {object} unzipOptions
 * - .acl write parameters
 * @property {boolean} [createPath=true] create parent containers if they don't exist
 * @property {LINKS} [links="include"]
 * @property {boolean} [withAcl=true] also copy acl files
 * @property {boolean} [withMeta=true] also copy meta files
 * @property {MERGE} [merge="replace"] specify how to handle existing files/folders
 * - .acl content validation parameters
 * @property {aclMode} [aclMode="Control"] specify the minimal existing mode to validate ACL document
 * @property {aclAuth} [aclAuth="must"] should be "must" (actually NSS accepts "may" = absence of acl:Authorization)
 * @property {aclDefault} [aclDefault="must"] specify if acl:default is needed to validate ACL document
 */
const unzipOptions = {
  links: 'include',
  withAcl: true,
  withMeta: true,
  merge: 'replace', // or 'keep_target'
  createPath: true,
  aclMode: 'Control',
  aclAuth: 'may',
  aclDefault: 'must' // needed to allow acces to folder content .meta ...
}

/**
 * @typedef {object} SolidFileClientOptions
 * @property {boolean|string} [enableLogging=false] - true for all logging or e.g. solid-file-client:fetch for partial logs
 */

/**
 * Class for working with files on Solid Pods
 * @extends SolidApi
 */
class SolidFileClient extends SolidApi {
  /**
   * @param {SolidAuthClient} auth - An auth client, for instance solid-auth-client or solid-auth-cli
   * @param {SolidFileClientOptions} [options]
   */
  constructor (auth, options) {
    super(auth.fetch.bind(auth), options)
    this._auth = auth
  }

  /**
     * Fetch an item and return content as text,json,or blob as needed
     * @param {string} url
     * @param {RequestInit} [request]
     * @returns {Promise<string|Blob|Response>}
     */
  async readFile (url, request) {
    const res = await this.get(url, request)
    const type = res.headers.get('content-type')
    if (type && type.match(/(image|audio|video)/)) { return res.blob() }
    if (res.text) { return res.text() }
    return res
  }

  /**
   * read Head as string
   * @param {string} url
   * @param {object} options
   * @returns {string} headStr
   */
  async readHead (url, options) {
    const response = await super.head(url, options)
    let headStr = ''
    for (var pair of response.headers.entries()) {
      headStr += pair[0] + ': ' + pair[1] + '\n'
    }
    return headStr
  }

  /**
   * delete file
   * @param {string} url
   * @returns {Promise<Response>} response of the file deletion
   */
  async deleteFile (url) { return super._deleteItemWithLinks(url) }

  /**
   * Delete a folder, its contents and links recursively
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with an array of deletion responses.
   * The first one will be the folder specified by "url".
   * The others will be the deletion responses from the contents in arbitrary order
   */
  async deleteFolder (url, options) { return super.deleteFolderRecursively(url,options) }

  /**
   * ACL content url parser
   * @param {string} url
   * @returns {object} an acl object from url.acl
   */
  async aclUrlParser (url) {
    const target = getItemName(url)
    const max = url.substring(getRootUrl(url).length - 2).split('/').length
    for (let i = 0; i < max; i++) {
      if (i) url = getParentUrl(url)
      const links = await this.getItemLinks(url, { links: 'include' })
      if (links.acl) {
        let aclContent = await this.readFile(links.acl)
        aclContent = this.acl.makeContentRelative(aclContent, url, target, { agent: 'no_modify' })
        if (target) aclContent = aclContent.replace(new RegExp('<./>', 'g'), '<./' + target + '>')
        return this.acl.contentParser(url, aclContent)
      }
    }
  }

  /**
   * Wrap API response for retrieving folder item list
   * @param {String} path
   * @returns {Promise<Item[]>}
   */
  async getFolderItemList (path, options) {
    options = {
      links: SolidFileClient.LINKS.INCLUDE,
      ...options
    };
    const folderData = await this.readFolder(path, options);
    let fi = folderData.files.map(item=>item.url);
    let fo = folderData.folders.map(item=>item.url);
    let itemList = fo.concat(fi);
    if (options.links !== SolidFileClient.LINKS.EXCLUDE && folderData.links) {
      itemList = itemList.concat(Object.values(folderData.links));
    }
    return itemList;
  }
 async getFolderItemListOLD (path, options) {
    options = {
      links: SolidFileClient.LINKS.INCLUDE,
      ...options
    }
    const folderData = await this.readFolder(path, options)
    let itemList
    if (options.links !== SolidFileClient.LINKS.EXCLUDE) {
      itemList = [
        ...Object.values(folderData.links),
        ...folderData.files.map(item => [item.url, ...Object.values(item.links)].flat()),
        ...folderData.folders.map(item => item.url)
      ]
    } else {
      itemList = [
        ...folderData.files.map(item => item.url),
        ...folderData.folders.map(item => item.url)]
    }
    return itemList.flat()
  }



  zipSupport () { return JSZip.support }

  /**
   * Request API to upload the items as zip archive
   * zip file contains a blob (or a string if async blob is not supported like in jest tests)
   * @param {string} resource path (file or folder)
   * @param {string} archiveUrl .zip file url
   * @param {object} options
   * @returns {promise<response>} res => { const success = await res.text() })>}
   */
  async createZipArchive (path, archiveUrl, options) {
    options = {
      ...zipOptions,
      ...options
    }
    if (options.links === SolidFileClient.LINKS.INCLUDE_POSSIBLE) {
      throw toFetchError(new Error(`option : "${SolidFileClient.LINKS.INCLUDE_POSSIBLE}", is not allowed for ZIP`))
    }
    if (!archiveUrl.endsWith('.zip')) {
      throw toFetchError(new Error(`invalid ${archiveUrl}, file must end with ".zip"`))
    }

    try {
      const type = this.zipSupport().blob ? 'blob' : 'string'
      return this.getAsZip(path, options)
        .then(zip => zip.generateAsync({ type: type }))
        .then(blob => this.createFile(archiveUrl, blob, 'application/zip'))
    } catch (err) {
      throw toFetchError(new Error(`getAsZip ${err}`))
    }
  }

  /**
   * Wrap API response for zipping multiple items
   */
  async getAsZip (path, options) {
    options = {
      ...zipOptions,
      ...options
    }
    const itemList = [path]
    const zip = new JSZip()

    return this.addItemsToZip(zip, itemList, options) // path
      .then(() => zip)
  }

  /**
   * Add items with links to a zip object recursively
   */
  async addItemsToZip (zip, itemList, options) {
    var promises = itemList.map(async item => {
      const itemName = getItemName(item)
      // zip folders with links
      if (item.endsWith('/')) {
        const folderZip = zip.folder(itemName)
        if (options.links === SolidFileClient.LINKS.INCLUDE) {
          await this.zipItemLinks(folderZip, item, options)
        }
        const folderItems = await this.getFolderItemList(item, { links: 'exclude' })
        await this.addItemsToZip(folderZip, folderItems, options)
      // zip file with links
      } else {
        if (this.zipSupport().blob) {
          const blob = await this.getFileBlob(item)
          zip.file(itemName, blob, { binary: true })
        } else {
          const content = this.readFile(item)
          zip.file(itemName, content, { binary: false })
        }
        if (options.links === SolidFileClient.LINKS.INCLUDE) {
          await this.zipItemLinks(zip, item, options)
        }
      }
    })

    return Promise.all(promises)
  }

  /**
   * Add item links to a zip object
   *
   * @param {object} zip
   * @param {Array} itemLinks
   * @param {string} itemName
   */
  async zipItemLinks (zip, item, options) {
    const links = await this.getItemLinks(item, options)
    let itemLinks = [...Object.values(links)]
    if (links.meta) {
      itemLinks = [itemLinks, ...Object.values(await this.getItemLinks(links.meta, options))].flat()
    }
    for (const i in itemLinks) {
      const itemLink = itemLinks[i]
      const { fileName, content } = await this.itemLinkContent(itemLink, item, options)
      /* if (this.zipSupport().blob) {
        // not supported by browser ???
        const blob = new Blob([content], { type: 'text/turtle' })
        zip.file(fileName, blob, { binary: true })
      } else zip.file(fileName, content, { binary: false }) */
      zip.file(fileName, content, { binary: false })
    }
  }

  async itemLinkContent (itemLinkUrl, item, options) {
    options = {
      agent: 'to_target',
      ...options
    }
    let content = await this.readFile(itemLinkUrl)
    let fileName = getItemName(itemLinkUrl)
    // we suppose for files the links extensions (.acl .meta .meta.acl) are the same
    // and suppose that name can be different
    const itemName = item.endsWith('/') ? '' : getItemName(item)
    if (itemName) {
      // not sure it is needed old 5.0 problems
      const name = fileName.replace(new RegExp('.acl$'), '').replace(new RegExp('.meta$'), '')
      fileName = fileName.replace(name, itemName)
    }
    // if object values are absolute URI's, make them relative
    if (itemLinkUrl.endsWith('.acl')) {
      content = this.acl.makeContentRelative(content, item, itemName, options)
    }
    return { fileName: fileName, content: content }
  }

  /**
   * Wrap API response for extracting a zip archive
   * unzip file is expecting a blob content (except if async blob is not supported like in jest tests)
   * @param {string} zip file
   * @param {string} destination folder
   * @param {object} options
   * @property {options} ...unzipOptions
   * @returns {promise<{ err: [], info: []}>)
   */
  async extractZipArchive (file, destination, options) {
    options = {
      ...unzipOptions,
      ...options
    }
    try {
      let blob
      if (this.zipSupport().blob) blob = await this.getFileBlob(file)
      else blob = await this.readFile(file) // more details to be given is it only for test ???
      const zip = await JSZip.loadAsync(blob)
      const responses = []
      const res = await this.uploadExtractedZipArchive(zip, destination, '', responses, options)
      const results = this.flattenObj(res, 'link')
      return results
    } catch (err) {
      throw toFetchError(new Error(`extractZipArchive ${err}`))
    }
  }

  flattenObj (obj, parent, res = {}) {
    // flattenObj
    let item
    for (const key in obj) {
      const propName = parent ? parent + '_' + key : key
      if (typeof obj[key] === 'object') {
        this.flattenObj(obj[key], propName, res)
      } else {
        item = propName.includes('err') ? { err: obj[key] } : { info: obj[key] }
        res[propName] = item
      }
    }
    // filter err and info with no doublons
    let filter = Object.values(res).filter(item => item.err).map(item => item.err)
    const err = Array.from(new Set(Object.values(filter)))
    filter = Object.values(res).filter(item => item.info).map(item => item.info)
    const info = Array.from(new Set(Object.values(filter)))

    return { err: err, info: info }
  }

  /**
   * Recursively upload all files and folders with links from an extracted zip archive
   *
   * @param {object} zip
   * @param {string} destination url
   * @param {string} curFolder
   * @param {Array} responses
   * @param {object} options
   * @returns {promise}
   */
  async uploadExtractedZipArchive (zip, destination, curFolder = '', responses, options) {
    options = {
      ...unzipOptions,
      ...options
    }
    const zipItems = await this._getItemsInZipFolder(zip, curFolder)
    const promises = zipItems.map(async item => {
      const relativePath = item.name
      if (item.dir) {
        responses = await this.uploadFolderWithLinks(item, destination, zipItems, options)
        return this.uploadExtractedZipArchive(zip, destination, item.name, responses, options)
      } else if (!relativePath.endsWith('.acl') && !relativePath.endsWith('.meta')) {
        responses = await this.uploadFileWithLinks(item, destination, zipItems, options)
      }
      return [].concat(...responses)
    })

    return Promise.all(promises)
  }

  async uploadFolderWithLinks (item, destination, zipItems, options) {
    const relativePath = item.name
    try {
      await this.createFolder(`${destination}${relativePath}`, options)
      return await this._uploadLinks(destination, relativePath, zipItems, options)
    } catch (e) { throw toFetchError(new Error('createFolder ' + e)) }
  }

  async uploadFileWithLinks (item, destination, zipItems, options) {
    const relativePath = item.name
    let contentType, blob
    try {
      const type = this.zipSupport().blob ? 'blob' : 'string'
      blob = await item.async(type)
      contentType = blob.type ? blob.type : mime.getType(relativePath)

      await this.createFile(`${destination}${relativePath}`, blob, contentType)
      return await this._uploadLinks(destination, relativePath, zipItems, options)
    } catch (e) { throw toFetchError(new Error('createFile ' + e)) }
  }

  async _uploadLinks (destination, relativePath, zipItems, options) {
    try {
      let createResponses = []
      if (options.links === SolidFileClient.LINKS.INCLUDE) {
        if (options.withAcl) {
          createResponses = createResponses.concat(await this._uploadItemLink(destination, relativePath, zipItems, 'acl', options))
        }
        if (options.withMeta) {
          createResponses = createResponses.concat(await this._uploadItemLink(destination, relativePath, zipItems, 'meta', options))
        }
      }
      return createResponses
    } catch (e) { throw toFetchError(new Error('uploadLinks ' + e)) }
  }

  async _uploadItemLink (destination, relativePath, zipItems, linkType, options, linksResponses = []) {
    const zipItemLink = zipItems.find(item => item.name === `${relativePath}.${linkType}`)
    try {
      if (zipItemLink) {
        let content
        if (this.zipSupport().blob) {
          const blob = await zipItemLink.async('blob')
          content = await blob.text()
        } else content = await zipItemLink.async('string')
        const linkResponse = await this._uploadLinkFile(destination, zipItemLink.name, content, options)
        // check for .meta.acl
        if (linkType === 'meta') return this._uploadItemLink(destination, `${relativePath}.meta`, zipItems, 'acl', options, linksResponses)
        linksResponses = linksResponses.concat(...linkResponse)
      }
      return linksResponses
    } catch (e) { throw toFetchError(new Error('_uploadItemLink ' + e)) }
  }

  /**
   * Check that link content is valid and create link
   */
  async _uploadLinkFile (path, fileName, content, options) {
    options = {
      ...unzipOptions,
      ...options
    }
    const linkUrl = path + fileName
    try {
      // linkExt = acl or meta
      // check content is valid turtle and/or acl
      const linkExt = fileName.slice(fileName.lastIndexOf('.') + 1)
      const linkParent = linkUrl.replace(new RegExp(`.${linkExt}$`), '')
      let isValidLink
      if (linkExt === 'acl') isValidLink = await this.isValidAcl(linkParent, content, options)
      else if (linkExt === 'meta') isValidLink = await this.isValidRDF(linkParent, content)
      if (isValidLink.err.length) return [{ err: [`${fileName} : ${isValidLink.err} ${isValidLink.info}`] }]

      // find and create link file
      var linkRes = []
      if (isValidLink.info.length) linkRes = [{ info: [`${fileName} : ${isValidLink.info}`] }]
      options.links = SolidFileClient.INCLUDE_POSSIBLE
      const links = await this.getItemLinks(linkParent, options)
      await this.putFile(links[linkExt], content, 'text/turtle')
      return linkRes
    } catch (e) { throw toFetchError(new Error('_uploadLinkFile ' + e)) }
  }

  _getItemsInZipFolder (zip, folderPath) {
    const folderAndLinks = ['/', '/.acl', '/.meta', '/.meta.acl']
    // add filter on options.links
    return Object.keys(zip.files)
      .filter(fileName => {
        // Only items in the current folder and subfolders
        const relativePath = fileName.slice(folderPath.length, fileName.length)
        if (!relativePath || fileName.slice(0, folderPath.length) !== folderPath) { return false }

        // Include current folder and links (.acl .meta .meta.acl)
        if (folderAndLinks.some(item =>
          relativePath.endsWith(item) && !relativePath.slice(0, -item.length).includes('/'))
        ) { return true }

        // No items from subfolders
        if (relativePath.includes('/') && relativePath.slice(0, -1).includes('/')) { return false }

        // No current links (they were already added at previous folder level)
        if (folderAndLinks.some(item => fileName.endsWith(item))) return false

        return true
      })

      .map(key => zip.files[key])
  }

  async getFileBlob (path) {
    const res = await this.get(path)
    return res.blob()
  }
}

export default SolidFileClient
