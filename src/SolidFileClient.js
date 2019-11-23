import SolidApi from './SolidApi'

/** TBD
 * maybe eventually reintroduce the fetch API response interface
 * for now throwErrors will be the only option so no need for this line
 * const defaultInitOptions = { throwErrors:false }
 */

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
  /** backwards incompatible change : users need to use new SolidFileClient(auth) */

  /**
   * @param {SolidAuthClient} auth - An auth client, for instance solid-auth-client or solid-auth-cli
   * @param {SolidFileClientOptions} [options]
   */
  constructor (auth, options) {
    super(auth.fetch.bind(auth), options)
    this._auth = auth
  }

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

  /**
     * Fetch an item and return content as text,json,or blob as needed
     * @param {string} url
     * @param {RequestInit} [request]
     * @returns {Promise<string|Blob|Response>}
     */
  async readFile (url, request) {
    // let self = this
    // TBD: Would be more concise as: const res = await this.get(url, request)
    //      (catching and throwing the same thing does not have an effect afaik)
    let res
    try { res = await this.get(url, request) } catch (e) { throw e }
    if (!res.ok) throw res
    // TBD: Same as with res
    let type
    try { type = res.headers.get('content-type') } catch (e) {
      throw e
    }
    // TBD: I've changed it to return something. Please check if this is the desired behaviour
    // TBD: Update this to use res.blob()
    if (type && type.match(/(image|audio|video)/)) {
      // TBD: Could be replaced with: return res.buffer() // or return res.blob()
      let blob = await res.buffer()
      return blob
    }
    if (res.text) {
      let text = res.text() // TDB: Use await res.text() instead? Or return res.text()
      return text
    }
    return res
  }

  // TBD: What is returned?
  // TBD: Remove contentType if not used anymore
  // TBD: Remove comment in function if it is not of use anymore
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
  // TBD: What types are s, p, o, g? What is returned?
  // TBD: None of these needs the async declaration. Only needed if await is used.
  async query (url, s, p, o, g) { return this.rdf.query(url, s, p, o, g) }

  // TBD: Why do we wrap head here? Why name it "read" if it only forwards head?
  async readHead (url, options) { return super.head(url, options) }

  async deleteFile (url, options) { return this.delete(url, options) }

  async moveFile (url, options) { return this.move(url, options) }

  async moveFolder (url, options) { return this.move(url, options) }

  // DELETE FOLDER
  // TBD: Use super.deleteFolderRecursively instead? Or don't specify it at all?
  async deleteFolderRecursively (url, options) {
    return this.deleteFolderRecursively(url, options)
  }

  async deleteFolder (url, options) {
    return this.delete(url, options)
  }

  // UPDATE FILE
  // TBD: Forward to putFile
  async updateFile (url, content, contentType) {
    if (await this.itemExists(url)) { await this.delete(url) }
    return this.createFile(url, content, contentType)
  }

  // TBD: Why do we declare it another time?
  async createFile (url, content, contentType) {
    return super.createFile(url, content, contentType)
  }

  // TBD: Remove this comment?
  /* OLD CREATE-FILE
  /*
    async createFile(url,content, contentType) {
       let ext = url.replace(/.*\./,'')
       contentType = contentType || "text/turtle"
       if(ext && ext==="ttl" && contentType==="text/turtle")
          url=url.replace(".ttl","")
    }
  async createFile (url, content, contentType) {
    return this._fetch(url, {
      method: 'PUT',
      body: content,
      headers: { 'Content-type': contentType }
    })
  }
  */

  // TBD: Remove this comment?
  /* TBD
   *
   * copyFile, copyFolder, moveFile, moveFolder
   *
   */
}

export default SolidFileClient
