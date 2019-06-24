import SolidApi from './SolidApi'

/** TODO
 * maybe eventually reintroduce the fetch API response interface
 * for now throwErrors will be the only option so no need for this line
 * const defaultInitOptions = { throwErrors:false }
 */
const defaultPopupUri = 'https://solid.community/common/popup.html'

/** TODO
 * @typedef {Object} Session
 *
 */

/** TODO
 * @typedef {Object} SolidAuthClient
 * @param {function(string, Object): Promise<Response>} fetch
 * @param {function({{ popupUri: string }}): Promise<Session>} popupLogin
 * @param {function(): Promise<Session>} currentSession
 * @param {function(): Promise<any>} logout
 */

/**
 * Class for working with the solid API
 * @extends SolidApi
 */
class SolidFileClient extends SolidApi {
  /**
   * Crete a new SolidFileClient
   * @param {SolidAuthClient,RdfLib} auth, rdflib
   */
  constructor (auth, options) {
    super(auth.fetch.bind(auth))
    this._auth = auth
    // see above on throwErrors this._throwErrors = options.throwErrors
    this.response = {}
  }

/* TBD
 * redo the comments for the login/session methods, they are wrong
 * in several respects
 */

    /**
     * Redirect the user to a login page if in the browser
     * or login directly from command-line or node script
     *
     * @param {Object} credentials
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
     * @returns {Session} or undefined if not logged in
     */
  async checkSession () {
    let session = await this._auth.currentSession()
    if (session) return session.webId
    else return undefined
  }

  /**
     * Return the currently active webId if available
     * @returns {Session} or undefined if not logged in
     */
  async currentSession () {
    return this._auth.currentSession()
  }

  /**
     * Get credentials from the current session
     * @param {any}
     * @returns {Object}
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

  /* TBD : refactor with await */
  /**
     * Fetch an item and reurn content as text,json,or blob as needed
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<string|object|blob}
     */
     async readFile(url,request){
      let self=this
      let res 
      try { res = await this.get(url,request) }catch(e) {return e}
      if(!res.ok) return res
      let type 
      try{ type = res.headers.get('content-type') }catch(e){
         return(e)
      }
      if(type && type.match(/(image|audio|video)/)){
        let blob = await res.buffer()
        Promise.resolve(blob)
      }
      else if(res.text) {
        let text =   res.text()
        return Promise.resolve(text) 
      }
      else Promise.resolve(res)
    }

    /**
     * Fetch an item and parse it
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<Object|RDFLIB.GRAPH}
     */
    async fetchAndParse(url, contentType) {
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


  async getHead(url,options) { return super.head(url, options) }
  async deleteFile(url,options) { return this.delete( url, options) }
  async deleteFolder(url,options){ return this.delete( url, options) }
  async updateFile(url,content, contentType) {
    if (await this.itemExists(url)) { await this.delete(url) }
    return this.createFile( url, content, contentType)
  }
}

export default SolidFileClient
