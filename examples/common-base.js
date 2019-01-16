if(typeof(window)==="undefined"){
    fc    = require('../src/index');
    batch = require('../src/batch');
}
let profile = 'https://jeffz.solid.community/profile/card'

const common = function(cfg){ return [
    "Testing solid-file-client ... logging in ...",
    function(){
        fc.login(cfg.credentials).then( session =>{
            console.log("logged in as "+session.webId)
            batch.ok("login")
        }, err => { batch.abort("Test aborted : "+err); });
    },
    function(){
        fc.createFolder(cfg.newFolder).then( res =>{
            batch.ok("create folder");
        }, err => batch.fail("create folder: "+err) );
    },
    function(){
        fc.createFile(cfg.newFile).then( res =>{
            batch.ok("create file");
        }, err => batch.fail("create file: "+err) );
    },
    function(){
        fc.updateFile(cfg.newFile,cfg.newText).then( res =>{
            batch.ok("update file");
        }, err => batch.fail("update file: ",err) );
    },
    function(){
        fc.copyFile(cfg.newFile,cfg.newFile+".copy.txt").then( res =>{
            batch.ok("copy file");
        }, err => batch.fail("copy file: ",err) );
    },
    function(){
        fc.readFile(cfg.newFile).then( body =>{
            if(body===cfg.newText) batch.ok("read file")
            else batch.abort("read file: got file, but text doesn't match");
        }, err => batch.fail("read file: "+err) );
    },
/*
    function(){
        if(typeof(window)!="undefined")  batch.skip()
        fc.downloadFile(profile).then( () =>{
            batch.ok("download file");
        }, err => batch.fail("dowload file : "+err) );
    },
    function(){
        if(typeof(window)!="undefined")  batch.skip()
        fc.uploadFile(cfg.newFolder+"/card").then( res =>{
            batch.ok("upload file");
        }, err => batch.fail("upload file : "+err) );
    },
*/
    function(){
        let wanted = 2;
        fc.readFolder(cfg.newFolder).then( folder =>{
            if( folder.files.length===wanted && folder.folders.length===0){
                batch.ok("read folder");           
            }
            else {
                batch.fail("got folder but its content is wrong");
            }
        }, err => batch.fail(err) );
    },
    function(){
     fc.deleteFile(cfg.newFolder+"/card").then( ()=> {
      fc.deleteFile(cfg.newFile+".copy.txt").then( ()=> {
        fc.deleteFile(cfg.newFile).then( ()=> {
            fc.readFile(cfg.newFile).then( body =>{
               batch.fail("got file that should have been deleted");
            }, err => batch.ok("delete file") );
        }, err => fail(err) );
      }, err => fail(err) );
     }, err => fail(err) );
    },
    function(){
        fc.deleteFolder(cfg.newFolder).then( ()=> {
            fc.readFile(cfg.newFolder).then( body =>{
               batch.fail("got folder that should have been deleted");
            }, err => batch.ok("delete folder") );
        }, err => fail(err) );
    },
    function(){
        var subj = profile + "#me"
        var pred = 'http://xmlns.com/foaf/0.1/name'
        fc.fetchAndParse( subj ).then( kb => {
            subj=kb.sym(subj)
            pred=kb.sym(pred)
            var name = kb.any(subj,pred).value
            if(name==="Jeff Zucker") batch.ok("fetch and parse");
            else batch.fail("fecthed and parse : fetched but bad parse");
         }, err => batch.fail("fetch and parse "+err) ) ;
    },
    function(){
        fc.checkSession().then( session => {
            if(session)  batch.ok("check session");
        }, err => fail(err) );
    },
    function(){
        fc.logout().then( ()=> {
            fc.checkSession().then( session => {
                batch.fail("still connected after logout")
            }, err => batch.ok("checkSession returns err if not connected") );
        }, err => fail(err) );
    },
]
}
if(typeof(window)==="undefined"){
    exports.common = common;
}
