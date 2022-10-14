//const auth = require('solid-auth-cli')
const auth = require('solid-node-client')

/**
   * expects "app://ls" OR "file://" OR "https://"
   * returns the appropriate base URL for each environment
   */
async function testPrep (scheme) {
  let base
  if (scheme === 'app://ls') { base = scheme }
  if (scheme === 'file://') { base = scheme + process.cwd() }
  if (scheme === 'https:') {
    let session = await auth.login()
    let webId = session.webId
    if (!webId) throw new Error("Couldn't login!")
    else console.log(`logged in as ${webId}`);
    base = webId.replace('/profile/card#me', '') + '/public'
  }
  return base + '/'
}

module.exports = {
  testPrep
}
