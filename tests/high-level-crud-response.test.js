import auth       from 'solid-auth-cli';
import FileClient from '../src/index.js'

let cfg

// choose error interface (throw/response)
   let throwErrors = false
// let throwErrors = true

// choose the storage type 
  let scheme = "app://ls"
//let scheme = "file://" 
//let scheme = "https://" 

const fc = throwErrors
  ? new FileClient(auth,{throwErrors:true})
  : new FileClient(auth)


async function getBase( scheme ){
  let base
  if( scheme.match("app:") ) { base = scheme }
  if( scheme.match("file:") ){ base = scheme + process.cwd() }
  if( scheme.match("https:") ){
    let session = await auth.login()
    let webId = session.webId
    if(! webId ) throw "Couldn't login!"
    base = webId.replace("/profile/card#me",'')+"/public"
  }
  return base
}

beforeAll(async () => {
  cfg = await getConfig(scheme)
  if(! await fc.itemExists(cfg.parent) ) await fc.createFolder( cfg.parent )
  console.log(cfg.parent)
})

  // createFolder()
  //
  test('createFolder',()=>{ return expect(
    testInterface("createFolder",cfg.folder)
  ).resolves.toBe(201) });

  // createFile()
  //
  test('createFile',()=>{ return expect(
    testInterface('createFile',cfg.file,cfg.expectedText)
  ).resolves.toBe(201) });

  // readFolder()
  //
  test('readFolder',()=>{ return expect(
    readFolder(cfg.folder)
  ).resolves.toBe(cfg.file) });

  // readFile()
  //
  test('readFile',()=>{ return expect(
    readFile(cfg.file)
  ).resolves.toBe(cfg.expectedText) });

  // fetchAndParse()
  //
/*
  test('fetchAndParse',()=>{ return expect(
    fetchAndParse(cfg.profile)
  ).resolves.toBe(true) });
*/
  // updateFile()
  //
  test('updateFile',()=>{ return expect(
    updateFile(cfg.file,cfg.expectedText2)
  ).resolves.toBe(true) });

  // getHead()
  //
  test('getHead()',()=>{ return expect(
    getHead(cfg.file)
  ).resolves.toBe(true) });

  // getLinks()
  //
  test('getLinks()',()=>{ return expect(
    getLinks(cfg.file)
  ).resolves.toBe(true) });


  // readFile() on non-existant resource
  //
  test('readFile on non-existant URL returns 404',()=>{ return expect(
    readFile(cfg.badFile)
  ).resolves.toBe(404) });

  // readFolder() on non-existant resource
  //
  test('readFolder on non-exitant folder returns 404',()=>{ return expect(
    readFolder(cfg.badFolder)
  ).resolves.toBe(404) });

  // itemExists returns true on existing resource
  //
  test('itemExists returns true on existing resource',()=>{ return expect(
    itemExists(cfg.folder)
  ).resolves.toBe(true) });

  // itemExists returns false on non-existing resource
  //
  test('itemExists returns true on existing resource',()=>{ return expect(
    itemExists(cfg.badFolder)
  ).resolves.toBe(false) });

  // deleteFolder() on non-empty folder
  //
  test('deleteFolder on non-empty folder returns 409',()=>{ return expect(
    testInterface("deleteFolder",cfg.folder)
  ).resolves.toBe(409) });

  // deleteFile()
  //
  test('deleteFile',()=>{ return expect(
    testInterface("deleteFile",cfg.file)
  ).resolves.toBe(200) });

  // deleteFolder()
  //
  test('deleteFolder',()=>{ return expect(
    testInterface("deleteFolder",cfg.folder)
  ).resolves.toBe(200) });


/* END OF TEST */

async function updateFile(url,content){
  if(throwErrors){
    try {
      await fc.updateFile(url,content);
      res = await fc.readFile(url)
      return res===content ? true : false
    }
    catch (e) { return false }
  }
  else {
try {
    let res = await fc.updateFile(url,content);
    if(!res.ok) return false
    res = await fc.readFile(url)
    if(!res.ok) return false
    return res.body===content ? true : false
}catch(e){console.log}
  }
}
async function getHead(url) {
  if(throwErrors){
    try {
      let res = await fc.getHead(url)
      if(res) return true
    }
    catch (e) { return false }
  }
  else {
    let res = await fc.getHead(url)
    if(res.ok) return true
    return false
  }
}
async function getLinks(url) {
  if(throwErrors){
    try {
      let links = await fc.getLinks(url)
      if(links.acl===url+".acl") return true
      return false
    }
    catch (e) { return false }
  }
  else {
    let res = await fc.getLinks(url)
    if(res.body.acl===url+".acl") return true
    return false
  }
}
async function fetchAndParse(profile) {
  if(throwErrors){
    try {
      let store = await fc.fetchAndParse(profile,"text/turtle")
      let subject = store.sym(profile)
      let predicate = store.sym("http://xmlns.com/foaf/0.1/name")
      let name = store.any(subject,predicate)
      if(!name) return false
      return  name.value.match("Jeff Zucker") ? true : false
    }
    catch (e) { return e }
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
async function getConfig(scheme){
  let base    = await getBase(scheme)
  let parent  = base   + "/test-folder/"
  let folder  = parent + (throwErrors ? "throwErrors" : "default")+"/"
  let badFile ="https://example.com/badurl"
  return {
    base:      base,
    parent:    parent,
    folder:    folder,
    file:      folder + "test.ttl",
    badFile:   badFile,
    badFolder: badFile+"/",
    expectedText:  "<> a <#test>.",
    expectedText2: "<> a <#revisedtest>.",
    profile: "https://jeffz.solid.community/profile/card#me"
  }
}
