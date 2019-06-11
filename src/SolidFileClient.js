import $rdf from 'rdflib'
import SolidApi from './SolidApi'
import folderUtils from './utils/folderUtils';

const { guessFileType, text2graph } = folderUtils

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
    constructor(auth,responseInterface) {
        super(auth.fetch.bind(auth))
        this._auth = auth
        this._responseInterface = responseInterface
        this.response = {}
    }

async getLinks(url){
  let iana    = 'http://www.iana.org/assignments/link-relations/'
  let aclRel  = $rdf.sym(iana+"acl")
  let metaRel = $rdf.sym(iana+"describedBy")
  let store = $rdf.graph()
  let fetcher = $rdf.fetcher(store,this._auth)
  let r = await fetcher._fetch(url,{method:"HEAD"}).catch(e=>e)
  if(!r.ok) return(r)
  await fetcher.parseLinkHeader(r.headers.get('link'),$rdf.sym(url),url)
  let acl  = store.any($rdf.sym(url),aclRel)
  let meta = store.any($rdf.sym(url),metaRel)
  return {
    ok : true,
    body : {
    acl  : acl.value,
    meta : meta.value
    }
  }
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
    async popupLogin(popupUri) {
        let session = await this._auth.currentSession()
        if (!session) {
            popupUri = popupUri || 'https://solid.community/common/popup.html'
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
            }).catch( err =>{resolve(self._isoErr(err))} )
          }
          else resolve(res)
        }).catch( err => {resolve(self._isoErr(err))} )
      })
    }

    _isoErr(err){
      if(this._responseInterface) return err
      else throw err
    }

    /**
     * Fetch an item and parse it
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<Object|RDFLIB.GRAPH}
     */
    async fetchAndParse(url, contentType) {
        if (!contentType) {
            contentType = this.folderUtils.guessFileType(url)
        }
  
        try {
          const response = await this.get(url)
          // TODO: Parse response
          return response
        }
        catch (e) {
          return this._isoErr(e)
          // throw new Error(`Fetch for ${url} failed with status code ${response.status}: ${response.statusText}`)
        }
    }

    _err (e) {
      return {
        ok : false,
        status : 500,
        statusText : e
      }
    }

    /* These methods return the uncaught SolidApi responses which fail on error
       unless _responseInterface is set, in which case they trap errors
       and send either a success response or an error response.
    */
    async itemExists(url,options){ return super.itemExists(url,options) }
    async deleteFile(url,options){ return this._api("delete",url,options) }
    async deleteFolder(url,options){ return this._api("delete",url,options) }
    async createFolder(url,options){ return this._api("createFolder",url,options) }
    async createFile(url,options){ return this._api("createFile",url,options) }

    async _api(method,url,options) {
      if(!this._responseInterface) {
        return super[method](url,options)
      }
      try {
        let res = await super[method](url,options)
        return res
      }
      catch(e) {
        return e
      }
    }


}

export default SolidFileClient
