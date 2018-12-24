"use strict";

const folderType = 'folder';

// import * as $rdf from 'rdflib'; 

// cjs-start 
    const $rdf = require('rdflib')
    exports.getStats = getStats;
    exports.folderType = folderType;
    exports.getFileType = getFileType;
    exports.getFolderItems = getFolderItems;
    exports.processFolder = processFolder;
    exports.guessFileType = guessFileType;
    exports.text2graph = text2graph;
// cjs-end

/*cjs*/ function getStats(graph,subjectName) {
  const subjectNode = $rdf.sym(subjectName);
  const mod = $rdf.sym('http://purl.org/dc/terms/modified');
  const size = $rdf.sym('http://www.w3.org/ns/posix/stat#size');
  const mtime = $rdf.sym('http://www.w3.org/ns/posix/stat#mtime');
  let  modified = graph.any(subjectNode, mod, undefined);
  if(typeof(modified)==="undefined") return false;
  else modified = modified.value;
  return {
    modified: modified,
    size: graph.any(subjectNode, size, undefined).value,
    mtime: graph.any(subjectNode, mtime, undefined).value,
  };
}

/** A type used internally to indicate we are handling a folder */
/**
 * @param {$rdf.IndexedFormula} graph a $rdf.graph() database instance
 * @param {string} url location of the folder
 * @returns {string} content mime-type of a file, If it's a folder, return 'folder', 'unknown' for not sure
 */
/*cjs*/ function getFileType(graph,url) {
  const folderNode = $rdf.sym(url);
  const isAnInstanceOfClass = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const types = graph.each(folderNode, isAnInstanceOfClass, undefined);
  for (const index in types) {
    const contentType = types[index].value;
    if (contentType.match('ldp#BasicContainer')) return folderType;
    if (contentType.match('http://www.w3.org/ns/iana/media-types/')) {
      return contentType.replace('http://www.w3.org/ns/iana/media-types/', '').replace('#Resource', '');
    }
  }
  return 'unknown';
}
/*cjs*/ function getFolderItems(graph, subj) {
        var contains = { folders : [], files   : [] }
        var itemsTmp = graph.each(
            $rdf.sym(subj),
            $rdf.sym('http://www.w3.org/ns/ldp#contains'),
            undefined
        )
        // self.log("Got "+itemsTmp.length+" items")
        for(let i=0;i<itemsTmp.length;i++){
             var item = itemsTmp[i];
             var newItem = {}
             newItem.type = getFileType( graph, item.value )
             var stats = getStats(graph,item.value)
             newItem.modified = stats.modified
             newItem.size = stats.size
             newItem.mtime = stats.mtime
             newItem.label=decodeURIComponent(item.value).replace( /.*\//,'')
             if(newItem.type===folderType){
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
                  contains.files.push(newItem)
             }
        }
        return contains;
}

/*cjs*/
/*
 function getFolderItems(graph, subjectName) {
  var contains = {files:[],folders:[]};
  const items = graph.each($rdf.sym(subjectName), $rdf.sym('http://www.w3.org/ns/ldp#contains'), undefined);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const newItem = {
      type: getFileType(graph, item.value),
      ...getStats(graph, item.value),
      label: decodeURIComponent(item.value).replace(/.*\//, ''),
      url: '',
      name: '',
    };
    if (newItem.type === folderType) {
      newItem.url = item.value.replace(/[/]+/g, '/').replace(/https:/, 'https:/');
      newItem.name = newItem.url.replace(/\/$/, '').replace(/.*\//, '');
      contains.folders.push(newItem);
    } else {
      newItem.url = item.value;
      newItem.name = newItem.url.replace(/.*\//, '');
      // if (newItem.name === 'index.html') hasIndexHtml = true;
      contains.files.push(newItem);
    }
  }
  return contains;
}
*/
/**
 * @param {$rdf.IndexedFormula} graph a $rdf.graph() database instance
 * @param {string} url location of the folder
 * @param {string} content raw content of the folder's RDF (turtle) representation,
 * @returns {Object} FolderData
 */
/*cjs*/ function processFolder(graph, url, content) {
  const items = getFolderItems(graph, url);
  const stats = getStats(graph, url);
  const fullName = url.replace(/\/$/, '');
  const name = fullName.replace(/.*\//, '');
  const parent = fullName.replace(name, '');
  return {
    type: folderType,
    name,
    url,
    modified: stats.modified,
    size: stats.size,
    mtime: stats.mtime,
    parent,
    content,
    folders: items.folders,
    files: items.files,
  };
}
/*cjs*/ function guessFileType(url) {
  const ext = url.replace(/.*\./, '');
  if (ext.match(/\/$/)) return folderType;
  if (ext.match(/(md|markdown)/)) return 'text/markdown';
  if (ext.match(/html/)) return 'text/html';
  if (ext.match(/xml/)) return 'text/xml';
  if (ext.match(/ttl/)) return 'text/turtle';
  if (ext.match(/n3/)) return 'text/n3';
  if (ext.match(/rq/)) return 'application/sparql';
  if (ext.match(/css/)) return 'text/css';
  if (ext.match(/txt/)) return 'text/plain';
  if (ext.match(/json/)) return 'application/json';
  if (ext.match(/js/)) return 'application/javascript';
  if (ext.match(/(png|gif|jpeg|tif)/)) return 'image';
  if (ext.match(/(mp3|aif|ogg)/)) return 'audio';
  if (ext.match(/(avi|mp4|mpeg)/)) return 'video';
  /* default */ return 'text/turtle';
}

/**
 * @param {string} text RDF text that can be passed to $rdf.parse()
 * @param {*} content the request body
 * @param {string} contentType Content-Type of the request
 * @returns {$rdf.IndexedFormula} a $rdf.graph() database instance with parsed RDF
 */
/*cjs*/ async function text2graph(text,url,contentType){
    return new Promise((resolve, reject)=>{
        contentType = contentType || guessFileType(url)
        var graph=$rdf.graph();
        try{
            $rdf.parse(text,graph,url,contentType);
            resolve( graph );
        } catch(err){
            reject( err )
        }
    })
}


