/**
 * Modified to be used directly to run solid-file-client tests (see L195-L200)
 */

/* 
   constructor should define the pacakage's name 
   by default this will be added to the x-powered-by header of all responses
*/
class SolidLocalStorage {
  constructor() {
    this.prefix = "ls"
    this.name = "solid-rest-localStorage-1.0.0"
    localStorage.setItem( "/", " " );
  }

/*
   getObjectType(pathname,options)
     * trys to find pathname in storage
     * if found, sets exists to true
     * sets type to "Container" or "Resource" or undefined
     * returns an array [type,exists]
*/
async getObjectType(pathname,options){
  let type = (pathname.match(/\/$/)) ? "Container" : "Resource";
  pathname = pathname.replace(/\/$/,'') // REMOVE TRAILING SLASH
  let exists = false
  let keys = Object.keys(localStorage)
  for(var k in keys) {
    let item = keys[k]
    if(type==="Container" && item.startsWith(pathname)){ exists=true; break }
    if(item === pathname){ exists=true; break }
  }
  return [type,exists] 
}

/*
  getResource(pathname,options)
    * gets a resource
    * on success, returns [ 200, resourceContents, optionalHeader ]
    * on failure, returns [ 500, undefined, optionalHeader ]
*/
async getResource(pathname,options){
  try { 
    let body = localStorage.getItem( pathname );
    return Promise.resolve( [ 200, body ] )
  }
  catch(e){ Promise.resolve( [500] ) }
}

/*
  getContainer(pathname,options)
    * returns an array of the container's contained resource names
    * OR returns a turtle representation of the container and contents
*/
async getContainer(pathname,options) {
  const files = Object.keys(localStorage)
    .filter(path => path.startsWith(pathname) && path != pathname) // Only children
    .map(path => path.substr(pathname.length))
    .filter(path => !path.slice(0, -1).includes("/")) // Only include direct children
    return files
}

dump(pathname,options) {
  let keys = Object.keys(localStorage).filter(k=>{
    if(!k.match(/(setItem|getItem|removeItem)/)) return k
  }).map(m=>{
    console.log( m, localStorage.getItem(m) )
  })
}
clear() {
  let keys = Object.keys(localStorage).filter(k=>{
    if(!k.match(/(setItem|getItem|removeItem)/)) return k
  }).map(item=>{
    this.deleteResource(item)
  })
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
    localStorage.setItem( pathname, options.body );
    return Promise.resolve( [201] )
  }
  catch(e){ console.log(e); return Promise.resolve( [500] ) }
}

/*
   postContainer(pathname,options)
      * creates a single Container
      * on success : status = 201
      * on error : status = 500
      * returns [status,undefined,optionalHeader]
*/
async postContainer(pathname,options){
  pathname = pathname + '/'     // because wasn't on slug
  return this.putResource(pathname,options)
}

/**
 * deleteResource(pathname, options)
    * on success, returns [200,undefined,optionalHeader]
    * on failure, returns [500,undefined,optionalHeader]
 */
async deleteResource(pathname,options){
  try {
    localStorage.removeItem(pathname)
    return Promise.resolve( [200] )
  }
  catch(e){ return Promise.resolve( [500] ) }    
}

/**
 * deleteContrainer(pathname, options)
    * on success, returns [200,undefined,optionalHeader]
    * on failure, returns [500,undefined,optionalHeader]
 */
async deleteContainer (pathname, options) {
  return await this.deleteResource(pathname, options)
}

async makeContainers(pathname,options){
  const inexistentParents = []

  // Get all parents which need to be created
  let curParent = getParent(pathname)
  while (curParent && !(await this.getObjectType(curParent))[1]) {
    inexistentParents.push(curParent)
    curParent = getParent(curParent)
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
}

/**
 * return parent url with / at the end.
 * If no parent exists return null
 * @param {string} url 
 * @returns {string|null}
 */
function getParent(url) {
  while (url.endsWith('/'))
    url = url.slice(0, -1)
  if (!url.includes('/'))
    return null
  return url.substring(0, url.lastIndexOf('/')) + '/'
}

/* 
  OPTIONAL METHODS

  see solid-rest.js code for examples of the defaults
  optionally provide your own to replace or augment the behavior

   text(stream)
     * response method to pipe text body
     * receives response body, returns piped string
   json(string)
     * response method to parse json body
     * receives response body returns a json object
   container2turtle(pathname,options,contentsArray)
     * iterates over container's contents, creates a turtle representation
     * returns [200, turtleContents, optionalHeader]
   getHeaders(pathname,options)
     * returns header fields to replace or augment default headers
*/

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
  module.exports = SolidLocalStorage
}
// alain pour solid-file-client jest tests
const localStorage = {
  getItem    : (key) => { return localStorage[key] },
  removeItem : (key) => { delete localStorage[key] },
  setItem    : (key,val) => { localStorage[key]=val },
}

//module.exports = SolidLocalStorage
