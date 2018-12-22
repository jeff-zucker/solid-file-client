if(typeof(window)==="undefined"){
    fc    = require('./');
    batch = require('./batch');
}
const crudTest = function(cfg){ return [
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
        fc.readFile(cfg.newFile).then( body =>{
            if(body===cfg.newText) batch.ok("read file")
            else batch.abort("read file: got file, but text doesn't match");
        }, err => batch.fail("read file: "+err) );
    },
    function(){
        fc.readFolder(cfg.newFolder).then( folder =>{
            if( folder.files.length===1 && folder.folders.length===0){
                batch.ok("read folder");           
            }
            else {
                batch.fail("got folder but its content is wrong");
            }
        }, err => batch.fail(err) );
    },
    function(){
        fc.deleteFile(cfg.newFile).then( ()=> {
            fc.readFile(cfg.newFile).then( body =>{
               batch.fail("got file that should have been deleted");
            }, err => batch.ok("delete file") );
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
        fc.checkSession().then( session => {
            if(session)  batch.ok("check session");
        }, err => fail(err) );
    },
    function(){
        fc.logout().then( ()=> {
            fc.checkSession().then( session => {
                if(session) 
                  batch.fail("still connected after logout")
                else batch.ok("logout");
            }, err => batch.fail(err) );
        }, err => fail(err) );
    },
]
}
if(typeof(window)==="undefined"){
    exports.crudTest = crudTest;
}
