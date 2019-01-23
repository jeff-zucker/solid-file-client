"use strict";
// import auth from 'solid-auth-client';
// import * as folderUtils from './folderUtils';

var solid;
if(typeof(auth)!="undefined") solid = { auth:auth };
// cjs-start
if(typeof(window)==="undefined"){
    solid = {auth : require('solid-auth-cli')};
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
    exports.copyFolder = copyFolder;
    exports.downloadFile = downloadFile;
    exports.copyFile = copyFile;
    exports.getCredentials = getCredentials;
    exports.text2graph = text2graph;
    exports.guessFileType = guessFileType;
    exports.processFolder = processFolder;
}
// cjs-end

/* based on @timbl's solid-recursive-copy
*/
/*cjs*/ function copyFolder(src, dest, options, indent = ''){
  options = options || {}
  console.log('deepCopying ' + src + '\n'+indent+'-> ' + dest)
  if( !src.match(/\/$/))  src += "/";
  if( !dest.match(/\/$/)) dest += "/";
  return new Promise(function(resolve, reject){
    function mapURI(src, dest, x){
        if (!x.startsWith(src)){
            throw new Error(`source {${x}} is not in tree {${src}}`)
        }
        return dest + x.slice(src.length)
    }
    readFolder(src).then( folder => {
        var promises = []
        var all = folder.folders.concat(folder.files)
        for(var i=0; i<all.length; i++){
            let here = all[i] // here is a solid-file-client file object
            let there = mapURI(src, dest, here.url)
            if (here.type==="folder") {
               createFolder(there).then( ()=> {
                   promises.push(
                       copyFolder(here.url,there,options, indent+'  ')
                   )
               })
            } 
            else { // copy a leaf
                console.log('copying ' + there)
                promises.push(copyFile(here.url, there))
            }
        }
        Promise.all(promises).then(resolve(true)).catch(function (e) {
            console.log("Overall promise rejected: " + e)
            reject(e)
         })
    }, e => { reject("Could not read folder : "+e) } )
  })
}

/*cjs*/ function guessFileType(url) {
    return folderUtils.guessFileType(url)
}
/*cjs*/ function processFolder(graph,url,content) {
    return folderUtils.processFolder(graph,url,content)
}
/*cjs*/ async function text2graph(text,url,contentType){
    return folderUtils.text2graph(text,url,contentType)
}

/*cjs*/ async function copyFile(oldFile,newFile) {
    readFile(oldFile).then( content => {
        createFile(newFile,content).then( res => {
            return(res)
        }, err => {throw new Error("copy upload error  "+err)});
    }, err => {throw new Error("copy download error  "+err)});
}
/*cjs*/ async function fetchAndParse(url,contentType){
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
/*cjs*/ async function popupLogin() {
    let session = await solid.auth.currentSession();
    if (!session) {
        let popupUri = 'https://solid.community/common/popup.html';
        session = await solid.auth.popupLogin({ popupUri });
    }
    return(session.webId);
}

/*cjs*/ async function checkSession() {
    var sess = await solid.auth.currentSession();
    if(sess) return sess;
    else throw new Error("No current session!");
}
/*cjs*/ async function login(credentials) {
  var session
  try {
     session = await solid.auth.currentSession();
     if(session) return session;
  }
  catch(err) {
      session = await solid.auth.login(credentials);
      return session;
  }
}
/*cjs*/ async function add(parentFolder, url, content, contentType) {
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
    solid.auth.fetch(parentFolder, request).then( res => {
      var location = res.headers.get('location')
      var file = location.substr(location.lastIndexOf('/') + 1)
      resolve( parentFolder+file );
  },err=>{reject(err)});
 });
}
/*cjs*/ async function createFolder(url) {
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
/*cjs*/ async function createFile(url, content, contentType) {
    return new Promise((resolve, reject)=>{
        const newThing = url.replace(/\/$/, '').replace(/.*\//, '');
        const parentFolder = url.substring( 0, url.lastIndexOf( newThing ) );
        add(parentFolder, newThing, content, contentType).then( res=>  {
            resolve( res);
        }, err=> {reject(err)});
    });
}
/*cjs*/ async function logout(){return(solid.auth.logout());}
/*cjs*/ async function deleteFile(url){return(remove(url));}
/*cjs*/ async function deleteFolder(url){return(remove(url));}
/*cjs*/ async function remove(url) {
 return new Promise((resolve, reject)=>{
     fetch(url, { method: 'DELETE' }).then( res => {
        resolve(res);
     }, err=> {
        resolve(err)
     });
  });
}
/*cjs*/ async function updateFile(url, content, contentType) {
    let res = await remove(url);
    if(res.match && res.match(/409/)) { throw new Error("Coulnd't delete, conflict!") } 
    res = await createFile(url, content,contentType);
    return(res)
//    if(res.match && res.match("Created")) return(res);
//    else throw new Error("Couln't create file");
}
/*cjs*/ async function readFile(url){
    return new Promise((resolve, reject)=>{
        fetch(url).then( result => {
            resolve(result);
        },err=>reject("fetch error "+err));
    });
}
/*cjs*/ async function readFolder(url){
    if (url.substr(-1) != '/') url += '/';
    return new Promise((resolve, reject)=>{
       fetch(url).then( folderRDF => {
            folderUtils.text2graph( folderRDF, url,'text/turtle').then(graph=>{
                   resolve( folderUtils.processFolder(graph, url, folderRDF) );
            },err=>reject(err));
        },err=>reject(err));
    });
}
/*cjs*/ async function fetch(url,request){
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
/*cjs*/ async function getCredentials(fn){
    return solid.auth.getCredentials(fn)
}
/*cjs*/ async function doWin(url) {
    return true;
}

/*cjs*/ async function downloadFile(url,localPath) {
  if(typeof(window)!="undefined") return doWin(url)
  return new Promise((resolve, reject)=>{
    fetch(url,{encoding:null}).then( content => {
        if( !localPath.match(/\/$/) ) localPath += "/"
        let fn = localPath + url.replace(/.*\//,'') 
        try { 
            fs.writeFileSync(fn,content);
            resolve(fn);
        }
        catch(err) { reject("write error "+fn+" "+err) }
    }, err => { reject("fetch error "+err) })
  });
}
/*cjs*/ async function uploadFile(fn,url) {
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
