const fs = require("fs");
const path = require("path");
//const fc = require("../dist/console/index.js");
const fc = require("../src/index.js");
const show = require("./sol.show.js");
const batch = require("../src/batch");
let credentials;

module.exports = runSol;
async function runSol(com,args) {
  let fn,source,target;
  return new Promise((resolve,reject)=>{  switch(com){

        case "help" :
        case "h" :
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

        case "rf" :
        case "readFolder" :
            source = mungeURL(args[0]);
            console.log("fetching from "+source)
            fc.readFolder(source).then( folderObject => {
                show("folder",folderObject);
                resolve()
            },err=>console.log(err));
            break;
        

        case "r" :
        case "read" :
        case "readFile" :
            source = mungeURL(args[0]);
            console.log("fetching from file "+source);
            fc.readFile(source).then( fileBody =>{
                show("file",fileBody);
                resolve()
            },err=>console.log(err));
            break;

        case "rm" :
        case "delete" :
            if( args.length>1 ){
                target = [ args ]  // in shell, multiple args
            }
            else target = args[0];
            if( typeof(target)!="string" && target.length<2){
                target = target[0];
            }
            if( typeof(target)==="string" ){
                target = mungeURL(target);
                if( target.match(/\*$/) ){
                    target = target.replace(/\*$/,'');
                    fc.readFolder(target).then( gotFolder => {
                        let all= gotFolder.folders.concat(gotFolder.files);
                        doMany("rm",all).then( ()=>{
                            resolve()
                        },err=>console.log(err));
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

        case "cf" :
        case "createFolder" :
            if( args.length>1 ){
                target = [ args ]
            }
            else target = args[0];
            if( typeof(target)!="string" && target.length<2){
                target = target[0];
            }
            if( typeof(target)==="string" ){
                target = mungeURL(target);
                console.log("creating folder '"+target+"'");
                fc.createFolder(target).then( () => {
                    console.log("created folder");
                    resolve();
                }, err => reject("error creating folder "+err) );
            }
            else {
                doMany("createFolder",target).then( ()=>{
                    resolve()
                }, err => reject(err) )
                break;
            }
            break;

        case "dn" :
        case "download" :
            [target,source] = args;
            fn = path.join( target , source.replace(/.*\//,'') )
            source = mungeURL(source);
            target = path.join(__dirname,fn);
            console.log("downloading from "+source+" to "+fn);
            fc.downloadFile(source,target).then( () => {
                console.log("downloaded");
                resolve();
            }, err => reject("error downloading file "+err) );
            break;

        case "up" :
        case "upload" :
            [ target, source ] = args;
            target = mungeURL(target);
            if( source.match && source.match(/\*$/) ){  // shell
                source = source.replace(/\*$/,'');
                source = path.join(__dirname,source);
	        fs.readdir(source, (err,files) => {
                    if(err) reject(err);
                    else {
                        files = files.map(x=>path.join(source,x))
                        doMany("upload",files,target).then( ()=>{
                            resolve()
                        }, err => reject(err) )
  		    }
                },err=>reject(err));
                break;
            }
            if( typeof(source)!="string" ){
                doMany("upload",source,target).then( ()=>{
                    resolve()
                }, err => reject(err) )
                break;
            }
            if( fs.lstatSync(source).isFile() ){
                 fn = source.replace(/.*\//,'')
                 console.log("uploading file "+target+fn);
                 fc.uploadFile(target,source).then( () => {
                      console.log("uploaded file");
                      resolve();
                 }, err => reject("error uploading file "+err) );
                break;
            }
            else if( fs.lstatSync(source).isDirectory() ){
                 source = source.replace(/.*\//,'')
                 target = path.join(target,source).replace(/^https:\//,"https://")
                 console.log("uploading folder "+target);
                 fc.createFolder(target).then( () => {
                      console.log("uploaded folder");
                      resolve();
                 }, err => reject("error uploading folder "+err) );
            }
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

        case "batch" :
            source = path.join(__dirname,args[0])
            fs.readFile( source, 'utf-8', (err,content) => {
                if(err) reject(err);
                else {
                    let set = []
                    let commands = content.split("\n")
                    for(c in commands){
                        let line = commands[c].trim()
                        if( !line ) continue;
                        let newArgs = line.split(/\s+/)
                        let newCom  = newArgs.shift()
                        set.push( function(){
                            runSol( newCom, newArgs ).then( ()=> {
                                batch.skip()
                            },err=>batch.skip(err) )
                        })
                    }
                    batch.run(set);
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
    if( url && url.match(/^https:\/[^/]/) )
         url = url.replace(/^https:\//,"https://")
    if( url && !url.match(/^http/) && credentials && credentials.base) 
        return credentials.base + url;
    else
        return url;
}
function mungeLocalFolder(source){
    let files = [];
    for(var s in source){
        if( fs.lstatSync(source[s]).isFile() ){
            files.push(source[s]);
        }
    }
    return(files)
}
async function doMany(com,files,targetDir){
    if( files.length < 1 ) return;
    let file = files.shift();
    if( typeof(file)!="string" ){
        file = file.url;
    }
    let fn = file.replace(/.*\//,'');
    if( targetDir ){
//        let target = path.join(targetDir,fn).replace(/:\//,'://');
        runSol(com,[targetDir,file]).then( ()=>{
            doMany(com,files,targetDir);
        });
    }
    else {
        runSol(com,[file]).then( ()=>{
            doMany(com,files);
        });
    }
}

