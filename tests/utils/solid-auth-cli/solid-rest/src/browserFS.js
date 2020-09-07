/* 
   constructor should define the package's name 
   by default this will be added to the x-powered-by header of all responses
*/

let zFs

class SolidBrowserFS {

  constructor(backends) {
    this.prefix = "bfs"
    this.name = "solid-rest-browserFS-1.1.0"
    BrowserFS.install(window);
    this.initBackends( backends )    
  }

  async initBackends( backends ){
    backends = backends || {}
    /* backend could be:
       {
       '/IndexedDB':{fs:"IndexedDB", options:{storeName:"bfs"}},
       '/HTML5FS'  :{fs:"HTML5FS",options:{size:5,type:1}},
       '/InMemory' :{fs:"InMemory", options:{size:40} },
       '/Dropbox'  :{fs:"Dropbox", options:{client: dropboxClient}},
       '/HTTPRequest' : { fs: "HTTPRequest", options:{} }
       }
    */
    return new Promise( async (resolve,reject) => {
      try {
          this._fsInit( backends, async (fs)=>{
              zFs = this.fs = fs
              return resolve(this.fs)
          })
      } catch(e){console.warn(e)}
    })
  }
  _fsInit( userMountpoints, callback ) {
      let mountpoints = Object.assign( userMountpoints, {
          '/LocalStorage' :{fs:"LocalStorage",options:{}},
          '/IndexedDB':{fs:"IndexedDB", options:{storeName:"bfs"}},
      })
      BrowserFS.configure({
          fs: "MountableFileSystem", options: mountpoints
      }, (e) => {
         if(e) throw "BrowserFS.configure error : " + e 
         else {
             zFs = this.fs = BrowserFS.BFSRequire('fs') 
             callback(this.fs)
         }
     })
  }

/* SOLID-REST METHODS */

/*
   getObjectType(pathname,options)
     * trys to find pathname in storage
     * if found, sets exists to true
     * sets type to "Container" or "Resource" or undefined
     * returns an array [type,exists]
*/
async getObjectType(pathname,options){
  pathname = pathname || "/"
  let type = (pathname.endsWith('/')) ?"Container" :"Resource"
   let exists = await this.fsExists(pathname,type)
   return Promise.resolve( [type,exists] ) 
}

/*
 getResource(pathname,options)
   * gets a resource
   * on success,returns [200,resourceContents,optionalHeader ]
   * on failure, returns [ 500, undefined, optionalHeader ]
*/
async getResource(pathname,options){
    try {
      let Content = await this.prom(this.fs.readFile,pathname)
      if( Content && Content.code && Content.code=="ENOENT")
          return Promise.resolve([404])
      Content=await Content.toString()
      return Promise.resolve([200,Content]) 
    }
    catch(e) { Promise.resolve([500]) }
  }

/*
  getContainer(pathname,options)
    * returns an array of the container's contained resource names
    * OR returns a turtle representation of the container and contents
*/
async getContainer(pathname,options) {
  pathname = pathname || "/"
  try {
     // let content = await this.prom(this.fs.readdir,pathname)
     let content = await this.readFolder(pathname)
     if(content && content.code && content.code=="ENOENT")
         Promise.reject(e)
     return Promise.resolve(content)
  }
  catch(e) { return Promise.reject(e) }
}

/*
   putResource(pathname,options)
     * creates a single Resource
     * on success : status = 201
     * on error : status = 500
     * returns [status,undefined,optionalHeader]
*/
async putResource(pathname,options){
    options = options || {};
    options.body = options.body || "";
    try {
        let response = await this.writeFile(pathname,options.body)
        return Promise.resolve(response) 
    } catch(e){ 
        console.warn(pathname,e)
        return Promise.reject([500]) 
    }
}

/*
   postContainer(pathname,options)
      * creates a single Container
      * on success : status = 201
      * on error : status = 500
      * returns [status,undefined,optionalHeader]
*/
async postContainer(pathname,options){
  if(!pathname.endsWith("/"))
      pathname = pathname + '/' // because wasn't on slug
  try {
      let response = await this.prom(this.fs.mkdir,pathname)
      return Promise.resolve( [201] )
  }
  catch(e) { Promise.reject("PostContainer Error: "+e)}
}

/*
  deleteFile(pathname,options)
    * deletes a fle
    * on success, returns [200,undefined,optionalHeader]
    * on failure, returns [500,undefined,optionalHeader]
*/
async deleteFile(pathname,options){
  try {
    let res = await this.prom(this.fs.unlink,pathname)
    if(res && res.code) { 
        return Promise.resolve([404]) 
    }
    return Promise.resolve( [200] )
  }
  catch(e){ console.warn(e); return Promise.resolve( [500] ) }    
}

/*
  deleteDir(pathname,options)
    * deletes a folder
    * on success, returns [200,undefined,optionalHeader]
    * on failure, returns [500,undefined,optionalHeader]
*/
async deleteDir(pathname,options){
  try {
      let res = await this.prom(this.fs.rmdir,pathname)
      if(res && res.code) { 
          console.warn(pathname, res.code)
          return Promise.reject(res.code) 
      }
      return Promise.resolve([200])
  }catch(e){console.warn(e); Promise.resolve([500])}
}

async makeContainers(pathname,options){
  const inexistentParents = []

  // Get all parents which need to be created
  let curParent = _getParent(pathname)
  while (curParent && !(await this.getObjectType(curParent))[1]) {
    inexistentParents.push(curParent)
    curParent = _getParent(curParent)
  }

  if (!curParent) // Should not happen, that we get to the root
    return [500]

  // Create missing parents
  while (inexistentParents.length) {
    // postContainer expects an url without '/' at the end
    await this.postContainer(inexistentParents.pop().slice(0, -1))
  }
  return [201]
}
/* UTILITY FUNCTIONS */
dump(pathname,options) {
  let keys = Object.keys(localStorage).filter(k=>{
    if(!k.match(/(setItem|getItem|removeItem)/)) return k
  }).map(m=>{
    console.log( m, localStorage.getItem(m) )
  })
}
  prom(fn,...args){
    return new Promise( async (resolve, reject) => {
      try {
        await fn(...args,(res,res2)=>{
          res = (res2) ?res2 :res
          return resolve(res)
        })
      } catch(e) { throw e }
    })
  }
  writeFile(pathname,content){
    return new Promise( async (resolve, reject) => {
      try {
        this.fs = this.fs || zFs
        if(typeof this.fs === "undefined") await this.initBackends()
        this.fs.writeFile(pathname,content, (err,response)=>{
          if(err){ console.warn(err); return resolve([404]) }
          else {
              return resolve([201])
          }
        })
      } catch(e) { console.warn(e); return resolve([500]) }
    })
  }
  readFile(fn){
    return new Promise( async (resolve, reject) => {
      try {
        this.fs.readFile(fn,async (err,readableStream)=>{
          if(err) return resolve( err )
          else {
              readableStream = await readableStream.toString()
              return resolve(readableStream)
          }
        })
      } catch(e) { return reject(e) }
    })
  }
  readFolder(fn){
    return new Promise( async (resolve, reject) => {
      try {
        this.fs.readdir(fn,async (err,folderArray)=>{
          if(err) resolve(err)
          else {
              return resolve(folderArray)
          }
        })
      } catch(e) { resolve(e) }
    })
  }
async fsExists(pathname,type){
    let res = false
    if(type==="Container"){
        try {        
          let res = await this.getContainer(pathname)
          return Promise.resolve(true)
        }
        catch(e){ Promise.resolve(false) }
    }
    else if(type==="Resource"){
        try {        
          let res = await this.getResource(pathname)
          return Promise.resolve(true)
        }
        catch(e){ Promise.resolve(false) }
    }
    else {
        throw "type error!!! "+type
    }
}/* end UTILS */

} /* end SolidBrowserFS */

/**
 * return parent url with / at the end.
 * If no parent exists return null
 * @param {string} url 
 * @returns {string|null}
 */
function _getParent(url) {
  while (url.endsWith('/'))
    url = url.slice(0, -1)
  if (!url.includes('/'))
    return null
  return url.substring(0, url.lastIndexOf('/')) + '/'
}

/*
  if it should work in nodejs, export the object
*/
if(typeof window==="undefined") {
  alert = (msg) => console.log(msg)
  localStorage = {
     getItem    : (key) => { return localStorage[key] },
     removeItem : (key) => { delete localStorage[key] },
     setItem    : (key,val) => { localStorage[key]=val },
  }
}

if(typeof module !="undefined") module.exports = SolidBrowserFS

/* END FILE */
