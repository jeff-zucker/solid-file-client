import auth from '../node_modules/solid-auth-cli';
import FC   from '../dist/node/solid-file-client.bundle.js'

const base   = "file://" + process.cwd()
const folder = base + "/test-folder/"
const file   = folder + "test.ttl"
const expectedText = "<> a <#test>."

const fc = new FC(auth);

beforeAll(() => fc.deleteFolder(folder))

  /* createFolder()
  */
  test('createFolder',()=>{ return expect(
    testApi("createFolder",folder)
  ).resolves.toBe(201) });

  /* createFile()
  */
  test('createFile',()=>{ return expect(
    testApi('createFile',file,expectedText)
  ).resolves.toBe(201) });

  /* readFolder()
  */
  test('readFolder',()=>{ return expect(
    readFolder(folder)
  ).resolves.toBe(file) });

  /* readFile()
  */
  test('readFile',()=>{ return expect(
    readFile(file)
  ).resolves.toBe(expectedText) });

  /* createFolder() with non-existant parent
  */
  test('createFolder with non-existant parent returns 404',()=>{ return expect(
    testApi("createFolder",folder+"/junk/bad/bad")
  ).resolves.toBe(404) });

  /* readFile() on non-existant resource
  */
  test('readFile on non-existant URL returns 404',()=>{ return expect(
    readFile("https://example.com/badurl")
  ).resolves.toBe(404) });

  /* readFolder() on non-existant resource
  */
  test('readFolder on non-exitant folder returns 404',()=>{ return expect(
    readFolder("https://example.com/badurl/")
  ).resolves.toBe(404) });

  /* deleteFolder() on non-empty folder
  */
  test('deleteFolder on non-empty folder returns 409',()=>{ return expect(
    testApi("delete",folder)
  ).resolves.toBe(409) });

  /* deleteFile()
  */
  test('deleteFile',()=>{ return expect(
    testApi("delete",file)
  ).resolves.toBe(200) });

  /* deleteFolder() on non-empty folder
  */
  test('deleteFolder',()=>{ return expect(
    testApi("delete",folder)
  ).resolves.toBe(200) });

async function readFolder(url) {
  let res = await fc.readFolder(url)
  if(!res.ok) return res.status
  else return res.body.files[0].url
}
async function readFile(url) {
  let res = await fc.readFile(url)
  if(!res.ok) return res.status
  else return res.body
}
async function testApi(method,url,content) {
  let res = await fc[method](url,content)
  return res.status
}
