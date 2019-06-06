import SolidApi from './SolidApi'
import folderUtils from './utils/folderUtils';

const { guessFileType } = folderUtils

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
     * @param {SolidAuthClient} auth 
     */
    constructor(auth) {
        super(auth.fetch.bind(auth))
        this._auth = auth
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
    async popupLogin() {
        let session = await this._auth.currentSession()
        if (!session) {
            const popupUri = 'https://solid.community/common/popup.html'
            session = await this._auth.popupLogin({ popupUri })
        }
        return session.webId
    }

    /**
     * Return the currently active session if available
     * @returns {Session}
     * @throws if not logged in
     */
    async checkSession() {
        const session = await this._auth.currentSession()
        if (!session) {
            throw new Error('No session available')
        }
        return session
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
     * Fetch an item and parse it
     * @param {string} url
     * @param {string} [contentType]
     * @returns {Promise<Object|RDFLIB.GRAPH}
     */
    async fetchAndParse(url, contentType) {
        if (!contentType) {
            contentType = guessFileType(url)
        }
  
        const response = await this.fetch(url)
        if (!response.ok) {
            throw new Error(`Fetch for ${url} failed with status code ${response.status}: ${response.statusText}`)
        }
        // TODO: Parse response
        return response
    }
}

export default SolidFileClient
