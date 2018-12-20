let solidAuth;
if(typeof(window)==='undefined'){
    solidAuth = require('./cli-auth')
}
else {
    solidAuth = require('solid-auth-client')
}
const fou = require('./folderUtils')

exports.createFile = createFile;
exports.createFolder = createFolder;
exports.readFile = readFile;
exports.readFolder = readFolder;
exports.updateFile = updateFile;
exports.deleteFile = remove;
exports.deleteFolder = remove;
exports.fetch = solidAuth.fetch;
exports.checkSession = checkSession;
exports.login = login;
exports.logout = solidAuth.logout;
exports.popupLogin = popupLogin;
exports.fetchAndParse = fetchAndParse;

async function fetchAndParse(url,contentType){
  return new Promise((resolve, reject)=>{
    contentType = contentType || fou.guessFileType(url)
    solidAuth.fetch(url).then( res => {
        if(!res.ok) { 
            reject( res.status + " ("+res.statusText+")" ); // HTTP ERROR
        }
        else if( contentType==='application/json' ){
            res.json().then( json => {
                resolve(json)        // JSON PARSE SUCCESS
            }, err=>reject(err) );   // JSON PARSE ERROR
        }
        else {
            res.text().then( txt => {
                text2graph(txt,url,contentType).then( graph => {
                    resolve(graph);  // RDF PARSE SUCCESS
                },err=>reject(err)); // RDF PARSE ERROR
            },err=>reject(err));     // TEXT READ ERROR
        }
    },err=>reject(err));             // NETWORK ERROR
  });
}
async function popupLogin() {
    let session = await solid.auth.currentSession();
    if (!session) {
        let popupUri = 'https://solid.community/common/popup.html';
        session = await solid.auth.popupLogin({ popupUri });
    }
    return(session.webId);
}

async function checkSession() {
    const session = await solidAuth.currentSession();
    return session;
}
async function login(credentials) {
  const session = await solidAuth.currentSession();
  if (!session) await solidAuth.login(credentials);
  else return session;
}



async function add(parentFolder, url, content, contentType) {
 return new Promise((resolve, reject)=>{
  let link = '<http://www.w3.org/ns/ldp#Resource>; rel="type"';
  if (contentType === 'folder') {
    link = '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"';
    contentType = 'text/turtle';
  }
  const request = {
    method: 'POST',
    headers: { slug:url, link },
    body: content
  };
  if(contentType) request.headers["Content-Type"] = contentType;
  solidAuth.fetch(parentFolder, request).then( res => {
      resolve(res)
  },err=>{reject(err)});
 });
}

async function createFolder(url) {
    return new Promise((resolve, reject)=>{
        createFile(url, undefined, "folder").then( res=> {
            resolve(res);
        },err=>{reject(err)});
    });
}

async function createFile(url, content, contentType) {
  return new Promise((resolve, reject)=>{
  const newThing = url.replace(/\/$/, '').replace(/.*\//, '');
  const parentFolder = url.replace(newThing, '').replace(/\/\/$/, '/');
  add(parentFolder, newThing, content, contentType).then( res=>  {
      resolve( res);
  }, err=> {reject(err)});
 });
}

async function remove(url) {
 return new Promise((resolve, reject)=>{
    solidAuth.fetch(url, { method: 'DELETE' }).then( res => {
        resolve();
     }, err=> {
//         if(err && err.toString().match(/404/)){
             resolve()
//         }
//         else reject(err)
     });
  });
}
async function updateFile(url, content, contentType) {
 return new Promise((resolve, reject)=>{
    remove(url).then(() => {
        createFile(url, content, contentType).then( res => {
            resolve(res);
        },err=>{reject(err)});
    },err=>{reject(err)});
 });
}
async function readFile(url){
    return new Promise((resolve, reject)=>{
        solidAuth.fetch(url).then( result => {
            resolve(result.body);
        },err=>reject(err));
    });
}
async function readFolder(url){
    return new Promise((resolve, reject)=>{
        solidAuth.fetch(url).then( folderRDF => {
           folderRDF = folderRDF.body;
           fou.text2graph(folderRDF, url, 'text/turtle').then( graph =>{
               resolve( fou.processFolder(graph, url, folderRDF) );
           },err=>reject(err));
        },err=>reject(err));
    });
}
/*
async fetch = function(url,request){
    return new Promise((resolve, reject)=>{
        solidAuth.fetch(url,request).then( res => {
            if(!res.ok) { 
                reject( res.status + " ("+res.statusText+")")
            }
            res.text().then( txt => {
                resolve(txt)
            }, err => reject(err) )
        }, err => reject(err) );
    })
}
*/
