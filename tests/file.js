#!/usr/bin/env node

const auth = require('solid-auth-cli')
const FileClient = require('../')
const fc = new FileClient(auth)

let [tests,fails,passes] = [0,0,0]

function ok ( label ) {
  tests = tests + 1;   
  passes = passes + 1
  console.log( "    ok "+label )
}
function fail ( label ) {
  fails = fails+1
  console.log( "    FAIL "+label );
}

async function run(scheme) {
    const cfg = getConfig(scheme)
    try {

      if( scheme==="https" ) {
        await auth.login()
        ok("log in")
      }

      if( await fc.itemExists(cfg.folder) ){
        await fc.deleteFolder( cfg.folder )
        ok("itemExists")
        ok("deleteFolder")
      }

      await fc.createFolder( cfg.folder )
      ok("createFolder")

      for(f of cfg.files) {
        let file = cfg.folder + f;
        await fc.createFile( file, getContent(f),"text/turtle" )
        let head = await fc.readHead( file )
        if( !head.headers.get('content-type').match("text/turtle") ){
          console.log( head.headers.get('content-type') )
          throw new Error("Content/type does not match")
        }
      }
      ok("createFile")
      ok("readHead")

      const folder = await fc.readFolder(cfg.folder,{links:"include"})
      if(folder.files[0].name===cfg.files[0]){
        ok("readFolder")
      }
      else { fail("readFolder") }
        

      let content = await fc.readFile(folder.files[0].url)
      if( content===getContent(folder.files[0].name) ){
        ok("readFile")
      }
      else { fail("readFile") }

      await fc.copyFile( cfg.fileToCopy, cfg.copiedFile )
      if( await fc.itemExists(cfg.copiedFile) ){
        ok("copyFile")
      }
      else { fail("copyFile") }

      await fc.deleteFile( cfg.copiedFile )
      if( !(await fc.itemExists(cfg.copiedFile)) ){
        ok("deleteFile")
      }
      else { fail("deleteFile") }

      await fc.move( cfg.fileToCopy, cfg.copiedFile )
      if( 
         await fc.itemExists(cfg.copiedFile) 
         && !(await fc.itemExists(cfg.fileToCopy) )
      ){
        ok("moveFile")
      }
      else { fail("moveFile") }

      await fc.copyFolder( cfg.folder, cfg.folder2 )
      if( 
         await fc.itemExists(cfg.folder2) 
      ){
        ok("copyFolder")
      }
      else { fail("copyFolder") }

      await fc.move( cfg.folder2, cfg.folder )
      if( 
         await fc.itemExists(cfg.folder) 
         && !(await fc.itemExists(cfg.folder2) )
      ){
        ok("moveFolder")
      }
      else { fail("moveFolder") }

      console.log(`test ${scheme}\n${passes}/${tests} tests passed, ${fails} failed\n`)
      tests = fails = passes = 0;
/*
  itemExists
  deleteFolder
  createFolder
  createFile
  readHead
  readFolder
  readFile
  moveFile
  copyFile
  deleteFile
  // moveFolder
  // copyFolder merge=replace
  // copyFolder merge=source
  // copyFolder merge=target
*/

    }
    catch(err) { console.log(err) }
}
run("file")
// run("https")

function getConfig( scheme ){
  const base = "file://" + process.cwd() + "/test-folder/"
  let cfg = {
    folder  : base + "firstFolder/",
    folder2 : base + "secondFolder/",
    files  : ["foo.ttl","foo.ttl.meta",".meta",".acl","foo.ttl.acl"]
  }
  cfg.fileToCopy = cfg.folder + "foo.ttl"
  cfg.copiedFile = cfg.folder + "foo2.ttl"
  return cfg
}

function getContent(fn){
  if(fn.match(/\.(ttl|meta)$/) ){
    return `<> a "test file".`
  }
  let thingToAccess = (fn===".acl") ? "./" : "./foo.ttl"
return `@prefix : <#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix pub: <${thingToAccess}>.
@prefix card: </profile/card#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

:ControlReadWrite
    a acl:Authorization;
    acl:accessTo pub:;
    acl:agent card:me, <mailto:dubZed@gmail.com>;
    acl:defaultForNew pub:;
    acl:mode acl:Control, acl:Read, acl:Write.
:Read
    a acl:Authorization;
    acl:accessTo pub:;
    acl:agentClass foaf:Agent;
    acl:defaultForNew pub:;
    acl:mode acl:Read.
`
}
