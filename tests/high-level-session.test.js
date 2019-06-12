import auth from '../node_modules/solid-auth-cli';
import FC   from '../src/index.js'

const myWebId="https://jeffz.solid.community/profile/card#me"

const fc = new FC(auth)

  /* login()
  */
  test('login',()=>{ return expect(
    login()
  ).resolves.toBe(true) });

  /* checkSession()
  */
  test('checkSession',()=>{ return expect(
    checkSession()
  ).resolves.toBe(true) });

  /* logout()
  */
  test('logout',()=>{ return expect(
    logout()
  ).resolves.toBe(true) });

  /* popupLogin()
  */
  test('popupLogin',()=>{ return expect(
    popupLogin()
  ).resolves.toBe(true) });

  /* getCredentials
  */
  test('getCredentials',()=>{ return expect(
    getCredentials()
  ).resolves.toBe(true) });


async function login() {
  let webId = await fc.login()
  if(webId && webId===myWebId) return true
  else return webId
}
async function popupLogin() {
  let webId = await fc.popupLogin()
  if ( webId && webId===myWebId) return true
  else return false
}
async function checkSession() {
  let webId = await fc.checkSession()
  if ( webId && webId===myWebId) return true
  else return false
}
async function currentSession() {
  let wsession = await fc.currentSession()
  if ( session && session.webId===myWebId) return true
  else return false
}
async function getCredentials() {
  let creds = await fc.getCredentials()
  if(creds && creds.idp) return true
  else return false
}
async function logout() {
  await fc.logout()
  let session = await fc.checkSession()
  if(session) return false
  else return true
}



