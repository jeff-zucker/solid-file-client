import auth from '../node_modules/solid-auth-cli';
import FC   from '../dist/node/solid-file-client.bundle.js'

const fc = new FC(auth);

  let webId = "https://jeffz.solid.community/profile/card#me"

  /* readFile() on existing resource
  */
  test('readFile on existing URL returns 200',()=>{ return expect(
    readFile(webId)
  ).resolves.toBe(200) });

  /* readFile() on non-existant resource
  */
  test('readFile on non-existant URL returns 404',()=>{ return expect(
    readFile("https://example.com/foo")
  ).resolves.toBe(404) });

async function readFile(URL) {
  await fc.readFile(URL)
  return fc.response.status
}
