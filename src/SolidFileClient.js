import SolidApi from './SolidApi'

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
}

export default SolidFileClient
