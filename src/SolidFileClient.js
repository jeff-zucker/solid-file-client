import SolidApi from './SolidApi'

/** TBD
 * maybe eventually reintroduce the fetch API response interface
 * for now throwErrors will be the only option so no need for this line
 * const defaultInitOptions = { throwErrors:false }
 */

const defaultPopupUri = 'https://solid.community/common/popup.html'

/** TBD
 * @typedef {Object} Session
 *
 */

/** TBD
 * @typedef {Object} SolidAuthClient
 * @param {function(string, Object): Promise<Response>} fetch
 * @param {function({{ popupUri: string }}): Promise<Session>} popupLogin
 * @param {function(): Promise<Session>} currentSession
 * @param {function(): Promise<any>} logout
 */

/**
 * @typedef {object} SolidFileClientOptions
 * @property {boolean|string} [enableLogging=false] - set to true to output all logging to the console or e.g. solid-file-client:fetch for partial logs
 */

/**
 * @typedef {object} LoginCredentials
 * @todo Update this declaration
 */

/**
 * Class for working with the solid API
 * @extends SolidApi
 * @example
 * const { auth } = require('solid-auth-client')
 * const SolidApi = require('solid-auth-api')
 * const fileClient = new SolidFileClient(auth)
 * await fileClient.popupLogin()
 * fileClient.createFolder('https:/.../foo/bar/')
 *   .then(response => console.log(`Created: ${response.url}`))
 */
class SolidFileClient extends SolidApi {
  /** backwards incompatible change : users need to use new SolidFileClient(auth) */

  /**
   * @param {SolidAuthClient} auth - An auth client, for instance solid-auth-client or solid-auth-cli
   * @param {SolidFileClientOptions} [options]
   */
  constructor (auth, options) {
    super(auth.fetch.bind(auth), options)
    this._auth = auth
  }

  /* TBD
   * redo the comments for the login/session methods, they are wrong
   * in several respects
   */

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
    let session = await this._auth.currentSession()
    if (session) return session.webId
    else return undefined
  }

  /**
   * Return the currently active webId if available
   * @returns {Promise<Session|undefined>} session if logged in, else undefined
   */
  async currentSession () {
    return this._auth.currentSession()
  }

  // TBD: Update parameters and return value
  /**
     * Get credentials from the current session
     * @param {any}
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

  /**
     * Fetch an item and return content as text,json,or blob as needed
     * @param {string} url
     * @param {RequestInit} [request]
     * @returns {Promise<string|Response|Blob>}
     */
  async readFile (url, request) {
    // let self = this
    let res
    try { res = await this.get(url, request) } catch (e) { throw e }
    if (!res.ok) throw res
    let type
    try { type = res.headers.get('content-type') } catch (e) {
      throw e
    }
    // TBD: I've changed it to return something. Please check if this is the desired behaviour
    // TBD: Update this to use res.blob()
    if (type && type.match(/(image|audio|video)/)) {
      let blob = await res.buffer()
      return blob
    }
    if (res.text) {
      let text = res.text()
      return text
    }
    return res
  }

  /**
   * fetchAndParse
   *
   * backwards incompatible change : dropping support for JSON parsing, this is only for RDF
   * backwards incompatible change : now reurns an rdf-query/N3 quad-store rather than an rdflib store
   * backwards incompatible change : parsed quads are returned, not a response object with store in body
   *
   * Fetch an item and parse it
   * @param {string} url
   * @param {string} [contentType]
   * @returns {Promise<object>}
   */
  async fetchAndParse (url, contentType) {
    return this.rdf.query(url)

    /*
      TBD: REFACTOR USING RDF-QUERY

          contentType = contentType || folderUtils.guessFileType(url) || "text/turtle"
          if( contentType==='application/json' ){
            try {
              let res = await this.fetch(url).catch(e=>{return this._err(e)})
              const obj = await JSON.parse(res);
              return(
                this._throwErrors ? obj : { ok : true, body : obj }
              )
            }
            catch(e) { return this._err(e) }
          }
          let store = $rdf.graph()
          let fetcher = $rdf.fetcher(store,this._auth)
          await fetcher.load(url).catch(e=>{return this._err(e)})
          if(this._throwErrors) return store
          else return store ? { ok:true, body:store } : { ok:false }
        }
        let store = $rdf.graph()
        let fetcher = $rdf.fetcher(store, this._auth)
        await fetcher.load(url).catch(e => { return this._err(e) })
        if (this._throwErrors) return store
        else return store ? { ok: true, body: store } : { ok: false }
    */
  }

  // TBD: Update type declarations (JSDoc)
  async query (url, s, p, o, g) { return this.rdf.query(url, s, p, o, g) }

  async readHead (url, options) { return super.head(url, options) }

  async deleteFile (url, options) { return this.delete(url, options) }

  async deleteFolder (url, options) { return this.deleteFolderRecursively(url, options) }

  async moveFile (url, options) { return this.move(url, options) }

  async moveFolder (url, options) { return this.move(url, options) }

  /* TBD
   * point to deleteFolderRecursively instead
   */
  // TBD: This method is already declared above
  async deleteFolder (url, options) { return this.delete(url, options) }

  async updateFile (url, content, contentType) {
    if (await this.itemExists(url)) { await this.delete(url) }
    return this.createFile(url, content, contentType)
  }
  /*
    async createFile(url,content, contentType) {
       let ext = url.replace(/.*\./,'')
       contentType = contentType || "text/turtle"
       if(ext && ext==="ttl" && contentType==="text/turtle")
          url=url.replace(".ttl","")
       return super.createFile( url, content, contentType )
    }
  */

  /* REMOVE THIS IF/WHEN NSS FIXES POST
  */
  async createFile (url, content, contentType) {
    return this._fetch(url, {
      method: 'PUT',
      body: content,
      headers: { 'Content-type': contentType }
    })
  }

  /* TBD
   *
   * copyFile, copyFolder, deleteFolder, moveFile, moveFolder
   *
   */
}

export default SolidFileClient
