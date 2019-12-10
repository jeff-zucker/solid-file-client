import SolidApi from './SolidApi'
import errorUtils from './utils/errorUtils'

const { toFetchError } = errorUtils

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

  /* BELOW HERE ARE ALL ALIASES TO SOLID.API FUNCTIONS */

  readHead (url, options) { return super.head(url, options) }

  async deleteFile (url) {
  // const urlAcl = await this.getLinks(url, true)
  // if (typeof urlAcl[0] === 'object') { let del = await this.delete(urlAcl[0].url) }  // TBD throw complex error
    let links = await this.getItemLinks(url)
    if (links.acl) this.delete(links.acl)
    return this.delete(url)
  }

  async deleteFolder (url, options) { return super.deleteFolderRecursively(url) }


  // TBD remove or replace with patchFile() method
  async updateFile (url, content, contentType) {
    return super.putFile(url, content, contentType)
  }

  async copyFile (from, to, options) { return super.copyFile(from, to, options) }

  async copyFolder (from, to, options) { return super.copyFolder(from, to, options) }

  // TBD error checking
  async moveFile (from, to) {
    await this.copyFile(from, to, { withAcl: true })
      .then(res => {
        if (res.status === '200') {
          return this.deleteFile(from)
        } else { return this.deleteFile(to) }
      })
      .catch(toFetchError)
  }

  // TBD error checking
  async moveFolder (from, to) {
    const res = await this.copyFolder(from, to)
    if (res.ok) {
      if (res.status === '200') {
        await this.deleteFolder(from)
      } else { await this.deleteFolder(to) }
    }
  }

  /* UTILITY FUNCTIONS */

  // TBD object.acl object.meta
  async getItemLinks (url) { return super.getItemLinks(url) }

  // TBD array of existings links
  async getLinks (url, options) { return super.getLinks(url, options) }

  /**
   * fetchAndParse
   *
   * backwards incompatible change :
   *   this method is no longer supported
   *   you may use rdflib directly instead
   */
}

export default SolidFileClient
