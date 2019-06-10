import auth from '../node_modules/solid-auth-cli';
import $rdf from '../node_modules/rdflib';
import FC   from '../dist/node/solid-file-client.bundle.js'

const base   = "file://" + process.cwd()
const folder = base + "/test-folder/"
const file   = folder + "test.ttl"
const expectedText = "<> a <#test>."

const fc = new FC(auth,$rdf);

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
  let session = await fc.login()
  if(session) return true
  else return false
}
async function popupLogin() {
  let session = await fc.popupLogin()
  if(session) return true
  else return false
}
async function checkSession() {
  let session = await fc.checkSession()
  if(session) return true
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
