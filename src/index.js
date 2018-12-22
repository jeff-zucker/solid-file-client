if(typeof(window)==='undefined'){
    solidAuth = require('./solid-shell-client')
    folderUtils = require('./folderUtils')
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
}
else {
    solidAuth = solid.auth;
    var fileClient = {
       createFile : createFile,
       createFolder : createFolder,
       readFile : readFile,
       readFolder : readFolder,
       updateFile : updateFile,
       deleteFile : remove,
       deleteFolder : remove,
       fetch : solidAuth.fetch,
       checkSession : checkSession,
       login : login,
       logout : solidAuth.logout,
       popupLogin : popupLogin,
       fetchAndParse : fetchAndParse,
    }
}
async function fetchAndParse(url,contentType){
  return new Promise((resolve, reject)=>{
    contentType = contentType || folderUtils.guessFileType(url)
    fetch(url).then( res => {
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
                folderUtils.text2graph(txt,url,contentType).then( graph => {
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
     fetch(url, { method: 'DELETE' }).then( res => {
        resolve(res);
     }, err=> {
        resolve(err)
     });
  });
}
async function updateFile(url, content, contentType) {
    let res = await remove(url);
    if(res.match(/409/)) { throw new Error("Coulnd't delete, conflict!") } 
    res = await createFile(url, content);
    if(res.match("Created")) return(res);
    else throw new Error("Couln't create file");
}
async function readFile(url){
    return new Promise((resolve, reject)=>{
        fetch(url).then( result => {
            resolve(result);
        },err=>reject(err));
    });
}
async function readFolder(url){
    return new Promise((resolve, reject)=>{
       fetch(url).then( folderRDF => {
            folderUtils.text2graph( folderRDF, url,'text/turtle').then(graph=>{
                   resolve( folderUtils.processFolder(graph, url, folderRDF) );
            },err=>reject(err));
        },err=>reject(err));
    });
}

async function fetch(url,request){
    return new Promise((resolve, reject)=>{
        solidAuth.fetch(url,request).then( res => {
            if(!res || !res.ok) { 
                reject( res.status + " ("+res.statusText+")")
            }
            res.text().then( txt => {
                resolve(txt)
            }, err => reject(err) )
       }, err => reject("!!!"+err) );
    })
}

