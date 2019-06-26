#!/usr/bin/env node
/*
CONNECT login, popupLogin, logout, currentSession
CREATE  createFile, createFolder
READ    readFile, readFolder, readHead, itemExists, query
UPDATE  updateFile, copyFile*, copyFolder*, moveFile*, moveFolder*
DELETE  deleteFile, deleteFolder*

Note : 
  - asterisks indicate methods TBD
  - copyFolder, moveFolder, deleteFolder are recursive (operate on an entire folder tree)
  - query is a replacement for fetchAndParse which I can't duplicate without rdflib
  
*/

//const auth       = require('solid-auth-cli')
//const auth       = require('solid-auth-client')
//const FileClient = require('../')
const fc = new SolidFileClient(auth,{throwErrors:false})

let [tests,fails,passes,res] = [0,0,0]

//getConfig("app://ls").then( cfg => { run(cfg) } )
// getConfig("file://").then( cfg => { run(cfg) } )
getConfig("https://").then( cfg => { run(cfg) } )

async function run(cfg){

  await prepTest(cfg)


  console.log("  CREATE")
  ok('201 createFolder, folder not found', 201, await t('createFolder',cfg.folder) )
  ok('200 createFolder, folder found',200,await t('createFolder',cfg.folder))
  ok('201 createFolder, parent not found', 201, await 
    t('createFolder',cfg.parentMissing) )

  ok('201 createFile, file not found',201, await t('createFile',cfg.file,cfg.expectedText) )
  ok('201 createFile, file found',201, await
    t('createFile',cfg.file,cfg.expectedText) )
  ok('201 createFile, parent not found',201, await
    t('createFile',cfg.deepFile,cfg.expectedText) )

  console.log("  READ")
  ok( '200 readFolder, folder found',true, await getFolder(cfg.folder) );
  ok( "404 readFolder, folder not found",404, await t('readFolder',cfg.badFolder) );

  ok('200 readFile, file found',true, await readFile(cfg.file,cfg.expectedText )) 
  ok( "404 readFile, file not found",404, await t('readFile',cfg.badFile) );

  ok('200 readHead, file found',true, await readHead(cfg.file,cfg )) 
  ok( "404 readHead, file not found",404, await readHead(cfg.badFile) )

  ok('true itemExists, file found',true, await t('itemExists',cfg.file)) 
  ok( "false itemExists, file not found",false, await t('itemExists',cfg.badFile) )

  ok('true itemExists, folder found',true, await t('itemExists',cfg.folder)) 
  ok("false itemExists, folder not found",false, await t('itemExists',cfg.badFolder) )

  ok("query",true, await query(cfg.folder,cfg))

  console.log("  UPDATE")
  ok('200 updateFile',true, await updateFile(cfg.file,cfg.expectedText2 )) 
  ok('404 updateFile, not found',false, await updateFile(cfg.badFile,cfg.expectedText2 )) 

// let res = await fc.readFolder(cfg.folder+"noSuchThing/") 
// console.log( res.body.files, res.body.folders )

  console.log("  DELETE")
  ok( '200 delete folder',200, await t('deleteFolder',cfg.parentMissing) );
  ok( "409 delete folder, non-empty",409, await t('deleteFolder',cfg.folder) )
  ok( "404 delete folder, not found",404, await t('deleteFolder',cfg.parentMissing) );

  ok( '200 delete file',200, await t('deleteFile',cfg.file) );
  ok( "404 delete file, not found",404, await t('deleteFile',cfg.file) );

  console.log(`${passes}/${tests} tests passed, ${fails} failed\n`)
}

async function updateFile(url,expected){
  try {
    let res = await fc.updateFile(url,expected)
    let got = await fc.readFile(url)
    return got===expected
  }
  catch(e){ return e }
}
async function getFolder(url,file){
  let res = await fc.readFolder(url)
//  if(res.body && res.body.files) return true
  if(res && res.files) return true
}
async function readFile(url,text){
  try {
    let res = await fc.readFile(url)
    return res===text
  }
  catch(e){ return e }
}
async function readHead(url){
  try {
    let res = await fc.readHead(url)
    return res.headers.get('allow') ? true : false
  }
  catch(e){ return e }
}
async function getBase( scheme ){
  let base,webId
  if( scheme.match("app:") ) { 
    base = scheme 
    console.log("Using "+base)
  }
  if( scheme.match("file:") ){ 
     base = scheme + process.cwd() 
    console.log("Using "+base)
   }
  if( scheme.match("https:") ){
    console.log("Logging in ...")
    let session = await auth.login()
    console.log("  logged in as <"+session.webId+">")
    webId = session.webId
    if(! webId ) throw "Couldn't login!"
    base = webId.replace("/profile/card#me",'')+"/public"
    console.log("  using base " + base)
  }
  return [base + "/",webId]
}
async function getConfig(scheme){
  let [base,webId] = await getBase(scheme)
  let parent  = base   + "test-folder/"
  let folder  = parent + "default/"
  let badFile ="app://ls/example.com/badurl"
  return {
    scheme:    scheme,
    webId:     webId,
    base:      base,
    parent:    parent,
    folder:    folder,
    file:      folder + "test.ttl",
    parentMissing:   folder + "noSuchThing/norThis/",
    deepFile:  folder +  "deep-folder/deep-file.ttl",
    badFile:   badFile,
    badFolder: badFile+"/",
    expectedText:  "<> a <#test>.",
    expectedText2: "<> a <#revisedtest>.",
//    profile: "https://jeffz.solid.community/profile/card#me" what is it used for ??
    profile: "https://jeffz.solid.community/profile/card#me"
  }
}
async function t(method,...args){
  return await fc[method](...args).catch(e=>{ return e })
}
function ok ( label,expected,got ) {
  got = got.status || got
  tests = tests + 1;   
  if(expected===got) passes = passes + 1
  else fails = fails+1
  if(expected===got)  console.log( "    ok "+label )
  else console.log( "    FAIL "+label + " : expected : "+expected+" got : "+got );
}

async function prepTest(cfg){
  console.log("Preparing test")
  await deleteTestFolders(cfg,cfg.folder)
  await deleteTestFolders(cfg,cfg.folder+"noSuchThing/norThis")
  await deleteTestFolders(cfg,cfg.folder+"noSuchThing/")
  await deleteTestFolders(cfg,cfg.folder+"deep-folder/")
  await deleteTestFolders(cfg,cfg.folder)
  console.log("Beginnning test")
}

async function deleteTestFolders(cfg,folderUrl) {
  try {
    const folder = await fc.readFolder(folderUrl)
    folder.files.forEach( async (file) => {
      const furl = folderUrl.replace(cfg.base,'')
      console.log("  deleting "+ furl)
      await fc.delete(file.url)
    })
    const furl = folderUrl.replace(cfg.base,'')
    console.log("  deleting "+furl)
    await fc.delete(folderUrl)
  }
  catch(e){return(e)}
}

async function query(folderUrl,cfg) {
  let files = await fc.query(folderUrl,{thisDoc:""},{ldp:"contains"})
  return files.length===3 ? true : false
}

  

