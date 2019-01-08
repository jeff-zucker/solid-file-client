// this is @timbl's, slightly modified by @jeff-zucker

// recursive copy Solid folders

// Just copy raw files, or parse and optinally transform RDF?
// Check whether destination directories exist first?
// Sync things in both directions?
// Use hashes from server to check identical trees?
// See all the options on rsync, unison, etc etc!!

const $rdf  = require('./rdflib-modified') // MODIFIED VERSION

const ldp = $rdf.Namespace('http://www.w3.org/ns/ldp#')
const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

const kb = $rdf.graph()
const fetcher = $rdf.fetcher(kb)

function deepCopy(src, dest, options, indent = ''){
  options = options || {}
  console.log('deepCopying ' + src + '\n'+indent+'-> ' + dest)
  return new Promise(function(resolve, reject){
    function mapURI(src, dest, x){
      if (!x.uri.startsWith(src.uri)){
        throw new Error(`source {${x}} is not in tree {${src}}`)
      }
      return kb.sym(dest.uri + x.uri.slice(src.uri.length))
    }
    fetcher.load(src).then(function(response) {
      if (!response.ok) throw new Error(
          'Error reading container ' + src + ' : ' + response.status
      )
      let contents = kb.each(src, ldp('contains'))
      promises = []
      for (let i=0; i < contents.length; i++){
        let here = contents[i]
        let there = mapURI(src, dest, here)
        if (kb.holds(here, RDF('type'), ldp('Container'))){
          promises.push(deepCopy(here, there, options, indent + '  '))
        } else { // copy a leaf
          console.log('copying ' + there.value)
          var type="text/turtle";
          promises.push(fetcher.webCopy(here, there, {contentType:type}))
        }
      }
      Promise.all(promises).then(resolve(true)).catch(function (e) {
        console.log("Overall promise rejected: " + e)
        reject(e)
      })
    })
    .catch(error => {
      reject('Load error: ' + error)
    })
  })
}

module.exports.copyFolder = function (src,dest,options,indent){
  return new Promise(function(resolve, reject){
      if( !src.match(/\/$/))  src += "/";
      if( !dest.match(/\/$/)) dest += "/";
      deepCopy( kb.sym(src),kb.sym(dest),options,indent ).then( ()=>{
          resolve()
      },e=>{ reject(e) })
  });    
}



// END
