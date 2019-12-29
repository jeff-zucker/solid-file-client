const auth            = require('solid-auth-cli')
const $rdf            = require('rdflib')
const SolidFileClient = require('../dist/node/solid-file-client.bundle.js')
const fc              = new SolidFileClient(auth);

async function main() {

  /* login()
  */
  let session = await fc.login()
  let webId = session.webId
  console.log(`Logged in as <${webId}>`)

  /* readFile() on existing resource
  */
  let fromReadFile = await fc.readFile(webId)
  if( fc.response.ok )
    console.log("ok readFile on existing URL")
  else 
    fc.err("FAIL readFile on existing URL")

  /* readFile() on non-existant resource
  */
  let badURL = "https://example.com/foo"
  fromReadFile = await fc.readFile(badURL)
  if( !fc.response.ok ) {
    if( fc.response.status == 404 ) 
      console.log("ok readFile on bad URL returns 404")
    else
      fc.err("FAIL readFile on non-existant URL")
  }
  else 
    fc.err("FAIL readFile on non-existant URL")
}
/*
    let store = await fc.fetchAndParse( webId )
    let subject   = store.sym(webId)
    let predicate = store.sym("http://xmlns.com/foaf/0.1/name")
    let name = store.any( subject, predicate, null )

    if( fromGet && fromReadFile 
     && fromGet === fromReadFile 
     && fromGet.match(name) 
    ){
        alert(`Hi ${name}!`)
    }
    else
        alert(`Something went wrong.`)
}
*/
main()
