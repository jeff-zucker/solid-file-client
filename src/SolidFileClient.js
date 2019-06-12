import $rdf from 'rdflib'
import SolidApi from './SolidApi'
import folderUtils from './utils/folderUtils';

const { guessFileType, text2graph } = folderUtils
const defaultInitOptions = { throwErrors:false }
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
    constructor(auth, options = defaultInitOptions) {
        super(auth.fetch.bind(auth))
        this._auth = auth
        this._throwErrors = options.throwErrors
        this.response = {}
    }

    async getLinks(url){
        let iana    = 'http://www.iana.org/assignments/link-relations/'
        let aclRel  = $rdf.sym(iana+"acl")
        let metaRel = $rdf.sym(iana+"describedBy")
        let store   = $rdf.graph()
        let fetcher = $rdf.fetcher(store,this._auth)
        let r = await fetcher._fetch(url,{method:"HEAD"}).catch(e=>{return this._err(e)})
        if(!r.ok) return(this._err(r))
        await fetcher.parseLinkHeader(r.headers.get('link'),$rdf.sym(url),url)
        let acl  = store.any($rdf.sym(url),aclRel)
        let meta = store.any($rdf.sym(url),metaRel)
        return this._ok( { acl:acl.value, meta:meta.value } )
    }


    /**
     * Redirect the user to a login page
     * @param {Object} credentials
     * @returns {Promise<Session>}
     */
    async login(credentials) {
        const session = await this._auth.currentSession()
        if (session) {
            return session
        }

        return this._auth.login(credentials)
    }


    /**
     * Open a popup prompting the user to login
     * @returns {Promise<string>} resolves with the webId after a successful login
     */
     async popupLogin(popupUri = defaultPopupUri) {
        let session = await this._auth.currentSession()
        if (!session) {
            if(typeof window === "undefined")
                session = await this._auth.login( popupUri )
            else
                session = await this._auth.popupLogin({ popupUri })
        }
        return session.webId
    }

    /**
     * Return the currently active session if available
     * @returns {Session} or undefined if not logged in
     */
    async checkSession() {
        return await this._auth.currentSession()
    }

    /**
     * Get credentials from the current session
     * @param {any}
     * @returns {Object}
     */
    getCredentials(fn) {
        return this._auth.getCredentials(fn)
    }

    /**
     * Logout the user from the pod
     * @returns {Promise<void>}
     */
    logout() {
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
      return new Promise((resolve,reject)=>{
        this.get(url,request).then( (res) => {
          let type = res.headers.get('content-type')
          if(type.match(/(image|audio|video)/)){
            res.buffer().then( blob => {
              resolve(blob)
            })
          }
          else if(res.text) {
            res.text().then( text => {
              return resolve( {ok:true, status:200, body:text } )
            }).catch( err =>{resolve(self._err(err))} )
          }
          else resolve(res)
        }).catch( err => {resolve(self._err(err))} )
      })
    }

    /**
     * Fetch an item and parse it
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<Object|RDFLIB.GRAPH}
     */
    async fetchAndParse(url, contentType) {
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

    _err (e) {
      let err = {
        ok : false,
        status : e.status || 500,
        statusText : e.statusText || e
      }
      if(this._throwErrors) throw err
      else return err
    }
    _ok (b) {
      if(this._throwErrors)  return b
      else return {
        ok : true,
        status :  200,
        statusText : "OK",
        body : b
      }
    }

    /* These methods return the uncaught SolidApi responses which fail on error
       unless throwErros is set to false, in which case they trap errors
       and send either a success response or an error response.
    */
    async do(method,...args){ return super[method](url,options) }
    async getHead(url,options){ return super.head(url,options) }
    async createFile(url,content,contentType){ 
      return this._api("createFile",url,content,contentType) 
    }
    async updateFile(url,content,contentType){ 
      if( await this.itemExists(url) ){ await this.delete(url) }
      return this._api("createFile",url,content,contentType) 
    }
    async deleteFile(url,options){ return this._api("delete",url,options) }
    async deleteFolder(url,options){ return this._api("delete",url,options) }
    async createFolder(url,options){ return this._api("createFolder",url,options) }
    

    /* TBD : pass methods, not names of methods 
    */
    async _api(method,...args) {
      if(this._throwErrors) {
        return super[method](...args)
      }
      try {
        let res = await super[method](...args)
        return res
      }
      catch(e) {
        return e
      }
    }
}

export default SolidFileClient
