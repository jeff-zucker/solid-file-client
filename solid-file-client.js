/* VERSION 0.1.0
**     
*/
var SolidFileClient = function(){

var self = this

if (typeof(module)!="undefined" ){
    if(typeof($rdf)==='undefined') $rdf = require('rdflib')
    if(typeof(solid)==='undefined') solid={auth:require('solid-auth-client')}
}

/* FILETYPES
*/
this.guessFileType = function(url){
    var ext = url.replace(/.*\./,'')
    if( ext.match( /\/$/ )   )         return 'folder'
    if( ext.match( /(md|markdown)/)  ) return 'text/markdown'
    if( ext.match( /html/)  )          return 'text/html'
    if( ext.match( /xml/)  )           return 'text/xml'
    if( ext.match( /ttl/) )            return 'text/turtle'
    if( ext.match( /n3/)  )            return 'text/n3'
    if( ext.match( /rq/) )             return 'application/sparql'
    if( ext.match( /css/) )            return 'text/css'
    if( ext.match( /txt/) )            return 'text/plain'
    if( ext.match( /json/) )           return 'application/json'
    if( ext.match( /js/) )             return 'application/javascript'
    if( ext.match( /(png|gif|jpeg|tif)/) )  return 'image'
    if( ext.match( /(mp3|aif|ogg)/) )  return 'audio'
    if( ext.match( /(avi|mp4|mpeg)/) )  return 'video'
    /* default */                      return 'text/turtle'
}
this.getFileType = function( graph, url ){
    var subj = $rdf.sym(url)
    var pred=$rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    var types = graph.each(subj,pred,undefined)
    for(var t in types){
        var type=types[t].value
        if( type.match("ldp#BasicContainer") )
            return "folder"
        if(type.match("http://www.w3.org/ns/iana/media-types/")){
            type=type.replace("http://www.w3.org/ns/iana/media-types/",'')
            return type.replace('#Resource','')
        }
    }
    return "unknown"
}
/* SOLID READ/WRITE FUNCTIONS
*/
this.createFile = async function(url,type,content){
    var newThing = url.replace(/\/$/,'').replace(/.*\//,'')
    var parentFolder = url.replace(newThing,'').replace(/\/\/$/,'/')
    var response = await this.add(parentFolder,newThing,type,content)
    return response
}
this.createFolder = async function(url){
    var response = await this.createFile( url,"folder")
    return response
}
this.deleteFolder = async function(url) {
    var res = await solid.auth.fetch(url,{method : 'DELETE'})
           .catch(err => { self.err = err; return false })
    if(res.ok) return true
    else { 
        self.err = res.status + " ("+res.statusText+")"
        return false 
    }
}
this.updateFile = async function(url,content) {
    var del = await this.deleteFile( url )
    // if(!del) return false
    var add = await this.createFile(url,undefined,content)
    return(add)
}
this.deleteFile = this.deleteFolder
this.readFile   = function(url){return this.fetch(url) }
this.readFolder = async function(url){
    var body = await self.fetch(url)
    if(!body) return false
    var graph = self.text2graph( body.value, url, "text/turtle" )
    if(!graph) return false
    return self.processFolder( graph, url, body.value ) 
}
this.fetchAndParse = async function(url,contentType){
    contentType = contentType || this.guessFileType(url)
    var res = await solid.auth.fetch(url).catch(err=>{
        self.err=err; console.log(err); return false;
    })
    if(!res.ok) { 
        self.err = res.status + " ("+res.statusText+")"
        return false 
    }
    if( contentType==='application/json' ){
        var obj = await res.json().catch(err=>{self.err=err; return false })
        return (obj)
    }
    var txt = await res.text().catch(err=>{self.err=err; return false })
    return self.text2graph(txt,url,contentType)
}
this.text2graph = function(text,url,contentType){
    contentType = contentType || this.guessFileType(url)
    var graph=$rdf.graph();
    try{
        $rdf.parse(text,graph,url,contentType);
        return graph;
    } catch(err){
        self.err=err
        return false
    }
}
this.add = async function(parentFolder,newThing,type,content) {
    var link = '<http://www.w3.org/ns/ldp#Resource>; rel="type"';
    var filetype;
    if(type==='folder'){
        var link = '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
        filetype = "text/turtle"
    }
    var request = {
         method : 'POST',
         headers : { 'Content-Type':filetype,slug:newThing,link:link }
    }
    if(content) request.body=content
    var response = await solid.auth.fetch( parentFolder, request )
                         .catch(err=>{self.err=err;return false})
    if(response.ok) return true
    else { 
        self.err = response.status + " ("+response.statusText+")"
        return false 
    }
}
this.fetch = async function(url,request){
    var res = await solid.auth.fetch(url,request).catch(err => {
       self.err = err; return false 
    })
    if(!res.ok) { 
        self.err = res.status + " ("+res.statusText+")"
        return false 
    }
    var txt = await res.text().catch(err => {
       self.err = err; return false 
    })
    return({value:txt})
}
/* SESSION MANAGEMENT
*/
this.checkSession = async function() { 
    var sess = await solid.auth.currentSession()
    if(!sess){
        self.webId = undefined
        return false;
    }
    self.webId = sess.webId
    return { webId : sess.webId }
}
this.popupLogin = async function() {
    let session = await solid.auth.currentSession();
    let popupUri = 'https://solid.community/common/popup.html';
    if (!session)
        session = await solid.auth.popupLogin({ popupUri });
    return(session.webId);
}
this.login = async function(idp) {
      const session = await solid.auth.currentSession();
      if (!session)
          await solid.auth.login(idp);
      return(session.webId);
}
this.logout = async function(){
    session=''
    var res = await solid.auth.logout();
    return res;
}
/* INTERNAL FUNCTIONS
*/
this.getStats = function(graph,subj){
    subj      = $rdf.sym(subj)
    var mod   = $rdf.sym('http://purl.org/dc/terms/modified')
    var size  = $rdf.sym('http://www.w3.org/ns/posix/stat#size')
    var mtime = $rdf.sym('http://www.w3.org/ns/posix/stat#mtime')
    return {
        modified : graph.any(subj,mod,undefined).value,
            size : graph.any(subj,size,undefined).value,
           mtime : graph.any(subj,mtime,undefined).value
    }
}
this.getFolderItems = function(graph,subj){
        var contains = {
            folders : [],
            files   : []
         }
        var itemsTmp = graph.each(
            $rdf.sym(subj),
            $rdf.sym('http://www.w3.org/ns/ldp#contains'),
            undefined
        )
        // self.log("Got "+itemsTmp.length+" items")
        for(i=0;i<itemsTmp.length;i++){
             var item = itemsTmp[i];
             var newItem = {}
             newItem.type = this.getFileType( graph, item.value )
             var stats = self.getStats(graph,item.value)
             newItem.modified = stats.modified
             newItem.size = stats.size
             newItem.mtime = stats.mtime
             newItem.label=decodeURIComponent(item.value).replace( /.*\//,'')
             if(newItem.type==='folder'){
                  item.value = item.value.replace(/[/]+/g,'/');
                  item.value = item.value.replace(/https:/,'https:/');
                  var name = item.value.replace( /\/$/,'')
                  newItem.name = name.replace( /.*\//,'')
                  newItem.url  = item.value
                  contains.folders.push(newItem)
             }
             else {
                  newItem.url=item.value
                  newItem.name=item.value.replace(/.*\//,'')
                  if(newItem.name==='index.html') self.hasIndexHtml=true
                  contains.files.push(newItem)
             }
        }
        return contains;
}
this.processFolder = function(graph,url,content,callback){
        // this.log("processing folder")
        var items = self.getFolderItems(graph,url);
        var stats = self.getStats(graph,url)
        var fullname = url.replace( /\/$/,'')
        var name = fullname.replace( /.*\//,'')
        var parent = fullname.replace(name,'')
        return({
             type : "folder",
             name : name,
              url : url,
         modified : stats.modified,
             size : stats.size,
            mtime : stats.mtime,
           parent : parent,
          content : content,
          folders : items.folders,
            files : items.files,
        })
}
return this
}
if (typeof(module)!="undefined" )  module.exports = SolidFileClient()
/* END */
