import SolidApi from './SolidApi'
import apiUtils from './utils/apiUtils'
import errorUtils from './utils/errorUtils'

const { getRootUrl, getParentUrl, getItemName } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
// const { isValidTtl } = isValidUtils

/**
 * default options for 'extractZipArchive'
 */
const defaultUploadOptions = {
  links: 'include', // SolidFileClient.LINKS.INCLUDE,
  withAcl: true,
  withMeta: true,
  merge: 'keep_target', // SolidFileClient.MERGE.KEEP_TARGET,
  createPath: true,
  aclMode: 'Control',
  aclAuth: 'may',
  aclDefault: 'must'
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
   * ACL content url parser
   * @param {string} url
   * @returns {object} an acl object from url.aclurl.acl
   */
  async aclUrlParser (url) {
    const target = getItemName(url)
    const max = url.substring(getRootUrl(url).length - 2).split('/').length
    for (let i = 1; i < max; i++) {
      url = getParentUrl(url)
      const links = await this.getItemLinks(url, { links: 'include' })
      if (links.acl) {
        let aclContent = await this.readFile(links.acl)
        aclContent = this.acl.makeContentRelative(aclContent, url, target, { agent: 'no_modify' })
        if (target) aclContent = aclContent.replace(new RegExp('<./>', 'g'), '<./' + target + '>')
        return this.acl.contentParser(url, aclContent)
      }
    }
  }
}

export default SolidFileClient
