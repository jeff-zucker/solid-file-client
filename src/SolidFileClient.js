import SolidApi from './SolidApi'
import errorUtils from './utils/errorUtils'

const { toFetchError } = errorUtils

const defaultPopupUri = 'https://solid.community/common/popup.html'

/**
 * @typedef {Object} SessionAuthorization
 * @property {string} client_id
 * @property {string} access_token
 * @property {string} id_token
 */

/**
 * @typedef {Object} Session
 * @property {string} idp
 * @property {string} webId
 * @property {string} issuer
 * @property {string} credentialType
 * @property {string} sessionKey
 * @property {string} idClaims
 * @property {SessionAuthorization} authorization
 */

/**
 * (optionally authenticated) fetch method similar to window.fetch
 * @callback fetch
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */

/**
 * @typedef {Object} SolidAuthClient
 * @property {fetch} fetch
 * @property {function(string, LoginOptions): Promise<Session|undefined>} login
 * @property {function({{ popupUri: string }}): Promise<Session>} popupLogin
 * @property {function(): Promise<Session>} currentSession
 * @property {function(function(Session?)): void} trackSession
 * @property {function(): Promise} logout
 */

/**
 * @typedef {object} SolidFileClientOptions
 * @property {boolean|string} [enableLogging=false] - true for all logging or e.g. solid-file-client:fetch for partial logs
 */

/**
 * @typedef {object} LoginCredentials
 * @todo Update this declaration
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

  /* START OF SESSION FUNCTIONS */

  // TBD: Clarify if this is for solid-auth-cli only
  /**
   * Redirect the user to a login page if in the browser
   * or login directly from command-line or node script
   *
   * @param {LoginCredentials} credentials
   * @returns {Promise<Session>}
   */
  async login (credentials) {
    let session = await this._auth.currentSession()
    if (!session) {
      session = await this._auth.login(credentials)
    }
    return session.webId
  }

  // TBD: What happens if the session returned by popupLogin is undefined?
  //      (I guess this happens when the user just closes the popup. Maybe it also rejects in this case)
  /**
   * Open a popup prompting the user to login
   * @param {string} [popupUri]
   * @returns {Promise<string>} resolves with the webId after a
   * successful login
   */
  async popupLogin (popupUri = defaultPopupUri) {
    let session = await this._auth.currentSession()
    if (!session) {
      if (typeof window === 'undefined') {
        session = await this._auth.login(popupUri)
      } else {
        session = await this._auth.popupLogin({ popupUri })
      }
    }
    return session.webId
  }

  /*  POSSIBLY NOT BACKWARDS-COMPATIBLE : now return webId not session
          note currentSession() returns session
               checkSession returns webId
    */
  /**
   * Return the currently active webId if available
   * @returns {Promise<Session|undefined>} session if logged in, else undefined
   */
  async checkSession () {
    const session = await this._auth.currentSession()
    if (session) return session.webId
    else return undefined
  }

  /**
   * Return the currently active session if available
   * @returns {Promise<Session|undefined>} session if logged in, else undefined
   */
  async currentSession () {
    return this._auth.currentSession()
  }

  // TBD: What type is fn? What type is returned?
  /**
     * Get credentials from the current session
     * @param {any} fn
     * @returns {object}
     */
  getCredentials (fn) {
    return this._auth.getCredentials(fn)
  }

  /**
   * Logout the user from the pod
   * @returns {Promise<void>}
   */
  logout () {
    return this._auth.logout()
  }

  /* END OF SESSION FUNCTIONS */

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

  // TBD: rdf.query ....

  /**
   * fetchAndParse
   *
   * backwards incompatible change :
   *   this method is no longer supported
   *   you may use rdflib directly instead
   */
}

export default SolidFileClient
