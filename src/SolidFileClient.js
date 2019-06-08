import SolidApi from './SolidApi'
//import folderUtils from './utils/folderUtils';

//const { guessFileType } = folderUtils

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
    constructor(auth,rdflib) {
        super(auth.fetch.bind(auth),rdflib)
        this._auth = auth
        this.response = {}
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


/*
updateFile
copyFile
copyFolder
fetchAndParse
upload
download
*/


    /**
     * Fetch an item and reurn content as text,json,or blob as needed
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<string|object|blob}
     */
    async readFile( url ){
      return new Promise( async (resolve) => {
        /* TO DO : use _fetch_resolved() to send text(), json() or blob()
        */
        let res = await this.get(url).catch(e=>{resolve(e)})
        if(!res.ok) return resolve(res)
        let txt= await res.text()
        return resolve(
          { 
            ok:true,
            status:200,
            body:txt
          }
        )
      })
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
  
        const response = await this.fetch(url)
        if (!response.ok) {
            throw new Error(`Fetch for ${url} failed with status code ${response.status}: ${response.statusText}`)
        }
        // TODO: Parse response
        return response
    }

    _err (e) {
      return {
        ok : false,
        status : 500,
        statusText : e
      }
    }

}

export default SolidFileClient
