/* START OF SESSION FUNCTIONS */
const defaultPopupUri = 'https://solid.community/common/popup.html'

var SolidSession = function(auth) {
	
  var self= this
  this._auth = auth

  /**
   * Redirect the user to a login page if in the browser
   * or login directly from command-line or node script
   *
   * @param {LoginCredentials} credentials
   * @returns {Promise<Session>}
   */
this.login = async (credentials) => {
  let session = await self._auth.currentSession()
  if (!session) {
    session = await self._auth.login(credentials)
  }
  return session.webId
}

  /**
   * Open a popup prompting the user to login
   * @param {string} [popupUri]
   * @returns {Promise<string>} resolves with the webId after a
   * successful login
   */
this.popupLogin = async (popupUri = defaultPopupUri) => {
  let session = await self._auth.currentSession()
  if (!session) {
    if (typeof window === 'undefined') {
      session = await self._auth.login(popupUri)
    } else {
    session = await self._auth.popupLogin({ popupUri })
    }
  }
  return session.webId
}

  /**
   * Return the currently active webId if available
   * @returns {Promise<Session|undefined>} session if logged in, else undefined
   */
this.checkSession = async () => {
  const session = await self._auth.currentSession()
  if (session) return session.webId
  else return undefined
}

  /**
   * Return the currently active session if available
   * @returns {Promise<Session|undefined>} session if logged in, else undefined
   */
this.currentSession = async () => {
  return self._auth.currentSession()
}

  /**
     * Get credentials from the current session
     * @param {any} fn
     * @returns {object}
     */
this.getCredentials = (fn) => {
  return self._auth.getCredentials(fn)
}

  /**
   * Logout the user from the pod
   * @returns {Promise<void>}
   */
this.logout = () => {
  return self._auth.logout()
}

return this
}
/* END OF SESSION FUNCTIONS */
