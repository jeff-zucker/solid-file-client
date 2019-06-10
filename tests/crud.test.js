import auth       from 'solid-auth-cli';
import $rdf       from 'rdflib';
import FileClient from '../'

//let fc_interface = "response"
let fc_interface = "catch"

const fc = fc_interface==="response"
  ? new FileClient(auth,{responseInterface:true})
  : new FileClient(auth)

const base   = "file://" + process.cwd()
const parent = base   + "/test-folder/"
const folder = parent + fc_interface+"/"
const file   = folder + "test.ttl"
const expectedText = "<> a <#test>."

beforeAll( async () => {
  await fc.deleteFolderRecursively(parent).catch(e=>e)
  await fc.createFolder(parent).catch(e=>e)
})


  /* createFolder()
  */
  test('createFolder',()=>{ return expect(
    testInterface("createFolder",folder)
  ).resolves.toBe(201) });

  /* createFile()
  */
  test('createFile',()=>{ return expect(
    testInterface('createFile',file,expectedText)
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
    testInterface("createFolder",folder+"/junk/bad/bad")
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
    testInterface("delete",folder)
  ).resolves.toBe(409) });

  /* deleteFile()
  */
  test('deleteFile',()=>{ return expect(
    testInterface("delete",file)
  ).resolves.toBe(200) });

  /* deleteFolder()
  */
  test('deleteFolder',()=>{ return expect(
    testInterface("delete",folder)
  ).resolves.toBe(200) });

async function readFolder(url) {
  if(fc_interface==="response"){
    let res = await fc.readFolder(url)
    if(res.ok) return res.body.files[0].url
    return res.status
  }
  else if(fc_interface==="catch"){
    let res = await fc.readFolder(url).catch(e=>{return e.status})
    if(res.ok) return res.body.files[0].url
    return res.status  // ???? is not trapped by catch
  }
}
async function readFile(url) {
  if(fc_interface==="response"){
    let res = await fc.readFile(url)
    if(!res.ok) return res.status
    else return res.body
  }
  else if(fc_interface==="catch"){
    let res = await fc.get(url).catch(e=>{return e.status})
    if(res.ok) return await res.text()
    return res  //  ???? is not trapped by catch
  }
}

async function testInterface(method,url,content) {
  if(fc_interface==="response"){
    let res = await fc[method](url,content)
    return res.status
  }
  try {
    let res = await fc[method](url,content)
    return res.status
  }
  catch(e) {
    return e.status
  }
}
