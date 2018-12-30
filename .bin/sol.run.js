const fs = require("fs");
const path = require("path");
//const fc = require("../dist/console/index.js");
const fc = require("../src/index.js");
const show = require("./sol.show.js");
let credentials;

module.exports = runSol;
async function runSol(com,args) {
  let fn,source,target;
  return new Promise((resolve,reject)=>{  switch(com){

        case "help" :
        case "-h" :
            show("help");
            resolve();
            break;

        case "login" :
            console.log("logging in ...");
            fc.getCredentials().then ( creds => {
                credentials = creds;
                fc.login( credentials ).then( session => {
                    console.log("logged in");
                    resolve();
                }, err => reject("error logging in : "+err) );
            }, err => reject("error getting credentials : "+err) );
            break;

        case "r" :
        case "read" :
            if(args[0]==="folder") {
                source = mungeURL(args[1])
                console.log("fetching from "+source)
                fc.readFolder(source).then( folderObject => {
                    show("folder",folderObject);
                    resolve()
                },err=>console.log(err));
            }
            else {
                source = mungeURL(args[0]);
                console.log("fetching from "+source);
                fc.readFile(source).then( fileBody =>{
                    show("file",fileBody);
                    resolve()
                },err=>console.log(err));
            }
            break;

        case "rm" :
        case "unlink" :
        case "delete" :
            target = args[0];
            if( typeof(target)!="string" && target.length<2){
                target = target[0];
            }
            if( typeof(target)==="string" ){
                target = mungeURL(target);
                if( target.match(/\*$/) ){
                    target = target.replace(/\*$/,'');
                    fc.readFolder(target).then( gotFolder => {
                        doMany("rm",gotFolder.files);
                        resolve()
                    },err=>console.log(err));
                    break;
                }
                console.log("deleting "+target);
                fc.deleteFile(target).then( () => {
                    console.log("deleted");
                    resolve();
                }, err => reject("error deleting "+err) );
                break;
            }
            else {
                doMany("delete",target).then( ()=>{
                    resolve()
                }, err => reject(err) )
                break;
            }
            break;

        case "md" :
        case "mkdir" :
        case "createFolder" :
            target = args[0];
            if( typeof(target)!="string" && target.length<2){
                target = target[0];
            }
            if( typeof(target)==="string" ){
                target = mungeURL(target);
                console.log("creating folder "+target);
                fc.createFolder(target).then( () => {
                    console.log("created folder");
                    resolve();
                }, err => reject("error creating folder "+err) );
                break;
            }
            else {
                doMany("createFolder",target).then( ()=>{
                    resolve()
                }, err => reject(err) )
                break;
            }
            break;

        case "d" :
        case "download" :
            fn = path.join( args[1] , args[0].replace(/.*\//,'') )
            args[0] = mungeURL(args[0]);
            args[1] = path.join(__dirname,fn);
            console.log("downloading from "+args[0]+" to "+fn);
            fc.downloadFile(args[0],args[1]).then( () => {
                console.log("downloaded");
                resolve();
            }, err => reject("error downloading file "+err) );
            break;

        case "u" :
        case "upload" :
            [ target, source ] = args;
            target = mungeURL(target);
            if( typeof(source)!="string" ){
                doMany("upload",source,target).then( ()=>{
                    resolve()
                }, err => reject(err) )
                break;
            }
            console.log("uploading "+source);
            souce = path.join(__dirname,source);
            fc.uploadFile(source,target).then( () => {
                console.log("uploaded");
                resolve();
            }, err => reject("error uploading file "+err) );
            break;

        case "cp"   :
        case "copy" :
            args[0] = mungeURL(args[0]);
            args[1] = mungeURL(args[1]);
            console.log("copying "+args[0]+" to "+args[1]);
            fc.copyFile(args[0],args[1]).then( () => {
                console.log("copied");
                resolve();
            }, err => reject("error copying file "+err) );
            break;

        case "dir" :
        case "ls" :
            fs.readdir("./", (err,files) => {
                if(err) reject(err);
                else {
                    files = files.join("\n");
                    console.log(files);
                    resolve();
                }
            },err=>reject(err));
            break;

        default :
            if( com.match && com.match(/^\!/) ){
                /* issue shell command, needs work 
                const shell = require('shelljs');
                shell.config.silent = true; // suppress stdout
                com = com.replace(/^\!/,'');
                results = shell.exec( com );
                console.log(results.stdout);
                resolve();
                */
            }
            else if(com) console.log("can't parse last command")
            resolve();
    }});
}
function mungeURL(url) {
    if( url && !url.match(/^http/) && credentials && credentials.base) 
        return credentials.base + url;
    else
        return url;
}

async function doMany(com,files,targetDir){
    if( files.length < 1 ) return;
    let file = files.shift();
    if( typeof(file)!="string" ){
        file = file.url;
    }
    let fn = file.replace(/.*\//,'');
    if( targetDir ){
        let target = path.join(targetDir,fn).replace(/:\//,'://');
        runSol(com,[target,file]).then( ()=>{
            doMany(com,files,targetDir);
        });
    }
    else {
        runSol(com,[file]).then( ()=>{
            doMany(com,files);
        });
    }
}
