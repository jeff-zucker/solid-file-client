if(typeof(window)==="undefined"){
    fc    = require('../src/index');
    batch = require('../src/batch');
    $rdf  = require('rdflib')
}
let profile = 'https://jeffz.solid.community/profile/card'

const node = function(cfg){ return [
    "Testing solid-file-client ... logging in ...",
    function(){
        fc.login(cfg.credentials).then( session =>{
            batch.ok("login")
        }, err => { batch.abort("Test aborted : "+err); });
    },
    function(){
        fc.deleteFolder(cfg.newFolder).then( res =>{
            if( res.match(/409/) ){ batch.ok("folder already exists"); }
            else fc.createFolder(cfg.newFolder).then( res =>{
                batch.ok("create folder");
            }, err => batch.fail("create folder: "+err) );
        }, err => batch.fail("delete folder: "+err) );
    },
    function(){
        fc.downloadFile(profile).then( () =>{
            batch.ok("download file");
        }, err => batch.fail("dowload file : "+err) );
    },
    function(){
        fc.uploadFile(cfg.newFolder+"/card").then( res =>{
            batch.ok("upload file");
        }, err => batch.fail("upload file : "+err) );
    },
    function(){
        let wanted = 1;
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
]
}
if(typeof(window)==="undefined"){
    exports.node = node;
}
