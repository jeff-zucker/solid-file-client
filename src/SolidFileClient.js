import SolidApi from './SolidApi'

/**
 * @typedef {object} SolidFileClientOptions
 * @property {boolean|string} [enableLogging=false] - true for all logging or e.g. solid-file-client:fetch for partial logs
 */

/**
 * Class for working with files on Solid Pods
 * @extends SolidApi
 * @example
 * const { auth } = require('solid-auth-client')
 * const fileClient = new SolidFileClient(auth)
 * await fileClient.popupLogin()
 * fileClient.createFolder('https:/.../foo/bar/')
 *   .then(response => console.log(`Created: ${response.url}`))
 */
class SolidFileClient extends SolidApi {
  /**
   * backwards incompatible change :
   *    users need to use new SolidFileClient(auth)
   */

  /**
   * @param {SolidAuthClient} auth - An auth client, for instance solid-auth-client or solid-auth-cli
   * @param {SolidFileClientOptions} [options]
   */
  constructor (auth, options) {
    super(auth.fetch.bind(auth), options)
    this._auth = auth
    // const link = new LinkUtils()
    // this.getLinks = link.getLinks
    // this.getItemLinks = link.getItemLinks
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

  readHead (url, options) { return super.head(url, options) }

  async deleteFile (url) {
  // const urlAcl = await this.getLinks(url, true)
  // if (typeof urlAcl[0] === 'object') { let del = await this.delete(urlAcl[0].url) }  // TBD throw complex error
    const links = await this.getItemLinks(url)
    if (links.acl) this.delete(links.acl)
    return this.delete(url)
  }

  async deleteFolder (url, options) { return super.deleteFolderRecursively(url) }
}

export default SolidFileClient
