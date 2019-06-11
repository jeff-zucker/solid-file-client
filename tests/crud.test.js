import auth       from 'solid-auth-cli';
import $rdf       from 'rdflib';
import FileClient from '../'

let throwErrors = false
// let throwErrors = true

const fc = throwErrors
  ? new FileClient(auth,{throwErrors:true})
  : new FileClient(auth)

const base   = "file://" + process.cwd()
const parent = base   + "/test-folder/"
const folder = parent + (throwErrors ? "throwErrors" : "default")+"/"
const file   = folder + "test.ttl"
const expectedText = "<> a <#test>."
const expectedText2 = "<> a <#revisedtest>."
const badFile ="https://example.com/badurl"
const badFolder= badFile+"/"
const profile = "https://jeffz.solid.community/profile/card#me"

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

  /* fetchAndParse()
  */
  test('fetchAndParse',()=>{ return expect(
    fetchAndParse(profile)
  ).resolves.toBe(true) });

  /* updateFile()
  */
  test('updateFile',()=>{ return expect(
    updateFile(file,expectedText2)
  ).resolves.toBe(true) });

  /* readFile() on non-existant resource
  */
  test('readFile on non-existant URL returns 404',()=>{ return expect(
    readFile(badFile)
  ).resolves.toBe(404) });

  /* readFolder() on non-existant resource
  */
  test('readFolder on non-exitant folder returns 404',()=>{ return expect(
    readFolder(badFolder)
  ).resolves.toBe(404) });

  /* itemExists returns true on existing resource
  */
  test('itemExists returns true on existing resource',()=>{ return expect(
    itemExists(folder)
  ).resolves.toBe(true) });

  /* itemExists returns false on non-existing resource
  */
  test('itemExists returns true on existing resource',()=>{ return expect(
    itemExists(badFolder)
  ).resolves.toBe(false) });

  /* deleteFolder() on non-empty folder
  */
  test('deleteFolder on non-empty folder returns 409',()=>{ return expect(
    testInterface("deleteFolder",folder)
  ).resolves.toBe(409) });

  /* deleteFile()
  */
  test('deleteFile',()=>{ return expect(
    testInterface("deleteFile",file)
  ).resolves.toBe(200) });

  /* deleteFolder()
  */
  test('deleteFolder',()=>{ return expect(
    testInterface("deleteFolder",folder)
  ).resolves.toBe(200) });

/* END OF TEST */


async function updateFile(url,content){
  if(throwErrors){
  }
  else {
    let res = await fc.updateFile(url,content);
    if(!res.ok) return false
    res = await fc.readFile(url)
    if(!res.ok) return false
    return res.body===content ? true : false
  }
}
async function fetchAndParse(profile) {
  if(throwErrors){
  }
  else {
    let res = await fc.fetchAndParse(profile,"text/turtle")
    if(!res.ok) return false
    let store = res.body
    let subject = store.sym(profile)
    let predicate = store.sym("http://xmlns.com/foaf/0.1/name")
    let name = store.any(subject,predicate)
    if(!name) return false
    return  name.value.match("Jeff Zucker") ? true : false
  }
}
async function itemExists(url) {
   return fc.itemExists(url)
}
async function readFolder(url) {
  if(throwErrors){
    let res = await fc.readFolder(url).catch(e=>{return e.status})
    if(res.ok) return res.body.files[0].url
    return res.status  // ???? is not trapped by catch
  }
  else {
    let res = await fc.readFolder(url)
    if(res.ok) return res.body.files[0].url
    return res.status
  }
}
async function readFile(url) {
  if(throwErrors){
    let res = await fc.get(url).catch(e=>{return e.status})
    if(res.ok) return await res.text()
    return res  //  ???? is not trapped by catch
  }
  else {
    let res = await fc.readFile(url)
    if(!res.ok) return res.status
    else return res.body
  }
}

async function testInterface(method,...args) {
  if(throwErrors){
    try {
      let res = await fc[method](...args)
      return res.status
    }
    catch(e) {
      return e.status
    }
  }
  else {
    let res = await fc[method](...args)
    return res.status
  }
}
