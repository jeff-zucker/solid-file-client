import SolidApi from './SolidApi'
import apiUtils from './utils/apiUtils'
import errorUtils from './utils/errorUtils'
import isValidUtils from './utils/isValidUtils'
import JSZip from 'jszip'
import * as mime from 'mime'

const { getRootUrl, getParentUrl, getItemName } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
const { isValidTtl } = isValidUtils

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
    this.isValidTtl = isValidTtl
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

  async readHead (url, options) {
    const response = await super.head(url, options)
    let headStr = ''
    for (var pair of response.headers.entries()) {
      headStr += pair[0] + ': ' + pair[1] + '\n'
    }
    return headStr
  }

  async deleteFile (url) { return super._deleteItemWithLinks(url) }

  async deleteFolder (url, options) { return super.deleteFolderRecursively(url) }

  /**
   * Wrap API response for retrieving item list
   * @param {String} path
   * @returns {Promise<Item[]>}
   */
  async getItemList (path, options = { links: SolidFileClient.LINKS.EXCLUDE }) {
    const folderData = await this.readFolder(path, options)
    const itemList = [
      ...folderData.files.map(item => item.url),
      ...folderData.folders.map(item => item.url)
    ]
    return itemList
  }

  /**
  * Request API to upload the items as zip archive
  */
  async createZipArchive (path, archiveUrl, options) {
    options = {
      links: SolidFileClient.LINKS.INCLUDE,
      withAcl: true,
      withMeta: true,
      // agent: SolidFileClient.AGENT.NO_MODIFY,
      createPath: true,
      ...options
    }
    if (options.links === SolidFileClient.LINKS.INCLUDE_POSSIBLE) {
      throw toFetchError(new Error(`option : "${SolidFileClient.LINKS.INCLUDE_POSSIBLE}", is not allowed for ZIP`))
    }
    if (!archiveUrl.endsWith('.zip')) {
      throw toFetchError(new Error(`invalid ${archiveUrl}, file must end with ".zip"`))
    }

    try {
      let itemList = [path]
      // if path is a file => getLinks
      if (!path.endsWith('/') && options.links === SolidFileClient.LINKS.INCLUDE) {
        itemList = [path, ...Object.values(await this.getItemLinks(path, options))].flat()
      }
      return this.getAsZip({ path }, itemList, options)
        .then(zip => zip.generateAsync({ type: 'blob' }))
        .then(blob => this.createFile(archiveUrl, blob, 'application/zip'))
    } catch (err) {
      throw toFetchError(new Error(`getAsZip ${err}`))
    }
  }

  /**
   * Wrap API response for zipping multiple items
   */
  async getAsZip (path, itemList, options) {
    console.log('getAsZip links ' + options.links)
    const zip = new JSZip()

    return this.addItemsToZip(zip, path, itemList, options)
      .then(() => zip)
  }

  /**
   * Add items with links to a zip object recursively
   */
  async addItemsToZip (zip, path, itemList, options) {
    console.log(Object.values(path) + '\n' + itemList)
    var promises = itemList.map(async item => {
      let itemLinks = []
      let links = {}
      if (options.links === SolidFileClient.LINKS.INCLUDE) {
        links = await this.getItemLinks(item, options)
          .catch(err => toFetchError(new Error(err)))
        itemLinks = [...Object.values(links)]
      }
      const itemName = getItemName(item)
      if (item.endsWith('/')) {
        const zipFolder = zip.folder(itemName)
        if (links.meta) {
          itemLinks = [itemLinks, ...Object.values(await this.getItemLinks(links.meta, options))].flat()
        }
        if (itemLinks.length) await this.zipItemLinks(zipFolder, itemLinks, '', item)
        const folderPath = item
        const folderItems = await this.getItemList(folderPath)
        await this.addItemsToZip(zipFolder, folderPath, folderItems, options)
      } else {
        const blob = await this.getFileBlob(item)
        await zip.file(itemName, blob, { binary: true })
        // cannot have zip as undefined ???
        if (itemLinks.length) await this.zipItemLinks(zip, itemLinks, itemName, item)
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
  async zipItemLinks (zip, itemLinks, itemName, item) {
    itemLinks.map(async file => {
      const blob = await this.getFileBlob(file)
      let fileName = getItemName(file)
      // If we can suppose for files the links extensions (.acl .meta .meta.acl) are the same
      // this suppose that name can be different
      if (itemName) {
        const name = fileName.replace(new RegExp('.acl$'), '').replace(new RegExp('.meta$'), '')
        fileName = fileName.replace(name, itemName)
      }
      // if object values are absolute URI's, make them relative
      if (file.endsWith('.acl')) {
        let content = await blob.text().catch(err => { throw toFetchError(new Error('blob ' + err)) })
        if (content.includes(item)) {
          content = content.replace(new RegExp('<' + item + '>', 'g'), '<./' + itemName + '>')
          return zip.file(fileName, content)
        }
      }
      await zip.file(fileName, blob, { binary: true })
    })
  }

  /**
   * Wrap API response for extracting a zip archive
   *
   */
  async extractZipArchive (file, destination, webId, options) {
    options = {
      links: SolidFileClient.LINKS.INCLUDE,
      ...({ withAcl: true, withMeta: true }),
      merge: SolidFileClient.KEEP_TARGET,
      ...({ createPath: true }),
      ...({ aclAuth: 'Control', aclValid: 'notStrict', aclInherit: 'must' }),
      ...options
    }
    try {
      const blob = await this.getFileBlob(file)
      const zip = await JSZip.loadAsync(blob)
      const responses = []
      const res = await this.uploadExtractedZipArchive(zip, destination, '', webId, responses, options)
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
        res[propName] = item // obj[key];
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
   * @param {string} webId
   * @param {Array} responses
   * @param {object} options
   */
  async uploadExtractedZipArchive (zip, destination, curFolder = '', webId, responses, options) {
    let zipItems = await this.getItemsInZipFolder(zip, curFolder) // , responses, options)
    zipItems = (options.links === SolidFileClient.LINKS.INCLUDE) ? zipItems
      : zipItems.filter(item => (!item.name.endsWith('.acl') && !item.name.endsWith('.meta')))
    console.log('zipItems ' + options.links + '\n' + JSON.stringify(zipItems.map(item => item.name)))
    const promises = zipItems.map(async item => {
      const relativePath = item.name
      if (item.dir) {
        responses = await this.createUploadFolderWithLinks(item, zip, destination, zipItems, webId, options)
        return this.uploadExtractedZipArchive(zip, destination, item.name, webId, responses, options)
      } else if (!relativePath.endsWith('.acl') && !relativePath.endsWith('.meta')) {
        responses = await this.createUploadFileWithAcl(item, destination, zipItems, webId, options)
      }
      return [].concat(...responses)
    })
    return Promise.all(promises)
  }

  async createUploadFolderWithLinks (item, zip, destination, zipItems, webId, options) {
    const relativePath = item.name
    await this.createFolder(`${destination}${relativePath}`, options)
      .catch(e => { throw toFetchError(new Error('createFolder ' + e)) })
    let createResponses = []
    if (options.links === SolidFileClient.LINKS.INCLUDE) {
      if (options.withAcl) {
        createResponses = createResponses.concat(await this.createUploadItemLink(destination, relativePath, zipItems, 'acl', webId, options))
      }
      if (options.withMeta) {
        createResponses = createResponses.concat(await this.createUploadItemLink(destination, relativePath, zipItems, 'meta', webId, options))
      }
    }
    return createResponses
  }

  async createUploadFileWithAcl (item, destination, zipItems, webId, options) {
    const relativePath = item.name
    const blob = await item.async('blob')
    const contentType = blob.type ? blob.type : mime.getType(relativePath)

    // check for acl resource
    try {
      await this.createFile(`${destination}${relativePath}`, blob, contentType)
      if (options.links === SolidFileClient.LINKS.INCLUDE) {
        if (options.withAcl) {
          return await this.createUploadItemLink(destination, relativePath, zipItems, 'acl', webId, options)
        }
      }
      return []
    } catch (e) { throw toFetchError(new Error('updateFile ' + e)) }
  }

  async createUploadItemLink (destination, relativePath, zipItems, linkType, webId, options, linksResponses = []) {
    const zipItemLink = zipItems.find(item => item.name === `${relativePath}.${linkType}`)
    if (zipItemLink) {
      const blob = await zipItemLink.async('blob')
      const content = await blob.text().catch(err => { throw toFetchError(new Error('blob ' + err)) })
      const linkResponse = await this.updateLinkFile(destination, zipItemLink.name, content, webId, options)
        .catch(err => { throw toFetchError(new Error('updateLinkFile ' + err)) })
      // check for .meta.acl
      if (linkType === 'meta') return this.createUploadItemLink(destination, `${relativePath}.meta`, zipItems, 'acl', webId, options, linksResponses)
      linksResponses = linksResponses.concat(...linkResponse)
    }
    return linksResponses
  }

  /**
   * Check that link content is valid and create link
   * @param {*} path
   * @param {*} fileName
   * @param {*} content
   * @param {*} webId
   */
  async updateLinkFile (path, fileName, content, webId, options) {
    options = {
      links: SolidFileClient.LINKS.INCLUDE,
      merge: SolidFileClient.MERGE.KEEP_TARGET,
      aclAuth: 'Control',
      aclValid: 'notStrict',
      aclInherit: 'must',
      ...options
    }

    const linkUrl = path + fileName
    try {
      const isValidLink = await this.isValidTtl(linkUrl, content, webId, options)
      if (isValidLink.err.length) return [{ err: [`${fileName} : ${isValidLink.err} ${isValidLink.info}`] }]
      // linkExt = acl or meta
      const linkExt = fileName.slice(fileName.lastIndexOf('.') + 1)
      // create link file
      var linkRes = []
      if (isValidLink.info.length) linkRes = [{ info: [`${fileName} : ${isValidLink.info}`] }]
      const linkParent = linkUrl.replace(new RegExp(`.${linkExt}$`), '')
      options.links = SolidFileClient.INCLUDE_POSSIBLE
      const links = await this.getItemLinks(linkParent, options)
        .catch(e => { throw toFetchError(new Error('getItemLinks ' + e)) })
      await this.putFile(links[linkExt], content, 'text/turtle')
      return linkRes
    } catch (e) { throw toFetchError(new Error('updateLinkFile ' + e)) }
  }

  getItemsInZipFolder (zip, folderPath) {
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
