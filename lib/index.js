"use strict";
import auth from 'solid-auth-client';
import * as folderUtils from './folderUtils';

var solid;
if(typeof(auth)!="undefined") solid = { auth:auth };
// cjs-start
/*
if(typeof(window)==="undefined"){
    solid = {auth : require('./solid-shell-client')};
    var folderUtils = require('./folderUtils')
    var fs = require('fs')
    exports.createFile = createFile;
    exports.createFolder = createFolder;
    exports.readFile = readFile;
    exports.readFolder = readFolder;
    exports.updateFile = updateFile;
    exports.deleteFile = deleteFile;
    exports.deleteFolder = deleteFolder;
    exports.fetch = fetch;
    exports.checkSession = checkSession;
    exports.login = login;
    exports.logout = logout;
    exports.popupLogin = popupLogin;
    exports.fetchAndParse = fetchAndParse;
    exports.uploadFile = uploadFile;
//    exports.uploadFolder = uploadFolder;
    exports.downloadFile = downloadFile;
    exports.copyFile = copyFile;
    exports.getCredentials = getCredentials;
}
*/
// cjs-end

export async function copyFile(oldFile,newFile) {
    readFile(oldFile).then( content => {
        createFile(newFile,content).then( res => {
            return(res)
        }, err => {throw new Error("copy upload error  "+err)});
    }, err => {throw new Error("copy download error  "+err)});
}
export async function fetchAndParse(url,contentType){
  return new Promise((resolve, reject)=>{
    contentType = contentType || folderUtils.guessFileType(url)
    fetch(url).then( res => {
/*
        if(!res.ok) { 
            reject( res.statusCode + " ("+res.statusMessage+")" ); // HTTP ERROR
        }
        else
*/
 if( contentType==='application/json' ){
            res.json().then( json => {
                resolve(json)    
            }, err=>reject("JSON parse : "+err) );
        }
        else {
              folderUtils.text2graph(res,url,contentType).then( graph => {
                    resolve(graph);
              },err=>reject("RDF parse : "+err));
        }
    },err=>reject(err));             // NETWORK ERROR
  });
}
export async function popupLogin() {
    let session = await solid.auth.currentSession();
    if (!session) {
        let popupUri = 'https://solid.community/common/popup.html';
        session = await solid.auth.popupLogin({ popupUri });
    }
    return(session.webId);
}

export async function checkSession() {
    const session = await solid.auth.currentSession();
    return session;
}
export async function login(credentials) {
  const session = await solid.auth.currentSession();
  if (!session) await solid.auth.login(credentials);
  else return session;
}
export async function add(parentFolder, url, content, contentType) {
 return new Promise((resolve, reject)=>{
  let link = '<http://www.w3.org/ns/ldp#Resource>; rel="type"';
  if (contentType === 'folder') {
    link = '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"';
    contentType = 'text/turtle';
  }
  const request = {
    method: 'POST',
    headers: { slug:url, link:link },
    body: content
  };
  if( typeof(contentType)!="undefined" || typeof(window)!="undefined") 
       request.headers["Content-Type"] = contentType;
    fetch(parentFolder, request).then( res => {
      resolve(res)
  },err=>{reject(err)});
 });
}
export async function createFolder(url) {
    return new Promise((resolve, reject)=>{
        readFile(url).then( res=> {
            resolve();  // folder exists, don't recreate it
        },err=>{
            createFile(url, undefined, "folder").then( res=> {
                resolve(res);
            },err=>{reject(err)});
        });
    });
}
export async function createFile(url, content, contentType) {
    return new Promise((resolve, reject)=>{
        const newThing = url.replace(/\/$/, '').replace(/.*\//, '');
        const parentFolder = url.substring( 0, url.lastIndexOf( newThing ) );
        add(parentFolder, newThing, content, contentType).then( res=>  {
            resolve( res);
        }, err=> {reject(err)});
    });
}
export async function logout(){return(solid.auth.logout());}
export async function deleteFile(url){return(remove(url));}
export async function deleteFolder(url){return(remove(url));}
export async function remove(url) {
 return new Promise((resolve, reject)=>{
     fetch(url, { method: 'DELETE' }).then( res => {
        resolve(res);
     }, err=> {
        resolve(err)
     });
  });
}
export async function updateFile(url, content, contentType) {
    let res = await remove(url);
    if(res.match && res.match(/409/)) { throw new Error("Coulnd't delete, conflict!") } 
    res = await createFile(url, content,contentType);
    return(res)
//    if(res.match && res.match("Created")) return(res);
//    else throw new Error("Couln't create file");
}
export async function readFile(url){
    return new Promise((resolve, reject)=>{
        fetch(url).then( result => {
            resolve(result);
        },err=>reject("fetch error "+err));
    });
}
export async function readFolder(url){
    return new Promise((resolve, reject)=>{
       fetch(url).then( folderRDF => {
            folderUtils.text2graph( folderRDF, url,'text/turtle').then(graph=>{
                   resolve( folderUtils.processFolder(graph, url, folderRDF) );
            },err=>reject(err));
        },err=>reject(err));
    });
}
export async function fetch(url,request){
    return new Promise((resolve, reject)=>{
        solid.auth.fetch(url,request).then( (res) => {
            if(!res.ok) { 
                reject( res.status + " ("+res.statusText+") "+url)
            }
            let type = (res.headers._headers)
               ? res.headers._headers['content-type']
               : ""
            type = type.toString()
            if(type.match(/(image|audio|video)/)){
                res.buffer().then( blob => {
                    resolve(blob)
                }, err => reject("buffer error "+err) );
            }
            else if(res.text) {
                res.text().then( text => {
                    resolve(text)
                }, err => reject("buffer error "+err) );
            }
            else resolve(res);
       }, err => { reject("fetch errror "+err+url) } );
    })
}
/* METHODS BELOW HERE HAVE BOTH WINDOWS AND CONSOLE VERSIONS
 */
export async function getCredentials(fn){
    return new Promise((resolve, reject)=>{
        fn = fn || "./solid-credentials.json";
        let creds;
        try {
            creds = fs.readFileSync(fn,'utf8');
        } catch(err) { reject("read file error "+err) }
        try {
            creds = JSON.parse( creds );
            if(!creds) reject("JSON parse error : "+err)
        } catch(err) { reject("JSON parse error : "+err) }
        resolve(creds);
    });
}
export async function doWin(url) {
    return true;
}

export async function downloadFile(url,fn) {
  if(typeof(window)!="undefined") return doWin(url)
  return new Promise((resolve, reject)=>{
    fetch(url,{encoding:null}).then( content => {
        try { 
            fs.writeFileSync(fn,content);
            resolve(fn);
        }
        catch(err) { reject("write error "+fn+" "+err) }
    }, err => { reject("fetch error "+err) })
  });
}
export async function uploadFile(url,fn) {
  if(typeof(window)!="undefined") return doWin(url)
    return new Promise((resolve, reject)=>{
    let content = fs.readFileSync(fn,'utf-8');
    if( !url.match(/\/$/) ) url += "/";
    url = url + fn.replace(/.*\//,'');
    deleteFile(url).then( () => {
        createFile(url,content).then( () => {
            resolve(fn);
        }, err => { reject("create "+err) });
    }, err => { reject("delete error "+err) });
  });
}

