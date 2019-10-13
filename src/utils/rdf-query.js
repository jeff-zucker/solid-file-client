"use strict"
const N3 = require('n3')
const ns = require('solid-namespace')()

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;


class RdfQuery {

  constructor(fetch) {
    this._fetch = fetch
    this.parser = new N3.Parser()
    this.store   = new N3.Store()
    this.prefix = {}
  }

  setPrefix(prefix,url){
    this.prefix[prefix]=url
  }
  getPrefix(prefix){
    return this.prefix[prefix]
  }

  async query( source,s,p,o,g ){
    if(!g) g = namedNode(source)
    [s,p,o,g]=[s,p,o,g].map( term => {
      if(typeof term==="object" && term){
        if(term.id) return term          // already a namedNode
        let prefix = Object.keys(term)   // a hash to munge into a namedNode
        let value = term[prefix]
        if(prefix=="thisDoc") {
          if(value) return namedNode(source+"#"+value) 
          else return namedNode(source) 
        }
        if(ns[prefix]) return namedNode( ns[prefix](value) )
        if(this.prefix[prefix]) return namedNode( this.prefix[prefix]+value )
        return namedNode( prefix + value )
      }
      if(typeof term !="undefined") return literal(term)  // literal
      return term                                         // undefined or null
    })
/*
console.log( s )
console.log( p )
console.log( o )
console.log( g )
*/
    if(source) this.store = new N3.Store()
    let store = source ? await this.loadFromUrl(source) :this.store
    let matches = await store.getQuads(g[0],g[1],g[2],g[3])
/*
    if(matches.length===1){
      let match = matches[0]
      let wanted = [s,p,o].filter(i=>{if(i) return i})
      if(wanted.length===2) {
        if(!s) return match.subject.value
        if(!p) return match.predicate.value
        if(!o) return match.object.value
      }
      return match
    }
*/
    return matches
    function mungeLiteral(nn){ 
      if(typeof nn==="undefined") return
      let str = nn.id.toString()
      if(str.startsWith('"') && str.endsWith('"') ){
        return str.replace(/^"/,'').replace(/"$/,'')
      }
      else return str
    }
  }

  async loadFromString(string,url){
    return new Promise( async(resolve)=>{
      await this._load(string,url)
      return resolve(this.store)
    })
  }

  async load(url) {
    let store = await this.loadFromUrl(url)
    store.query = this.query
    return store
  }
 

  async loadFromUrl(url) {
    const res = await this._fetch(url, { headers: { "Accept": "text/turtle" }})   // needed for https://<podName>/ when there is an index.html
    if (!res.ok) {
      throw res
    }
    const string = await res.text()
    this.store = await this._load(string, url)
    return this.store
  }

  async _load(string,url){
    return new Promise( async(resolve)=>{
      let quads =  await this._parse(string,url)
      this.store.addQuads(quads)
      return resolve(this.store)
    })
  }

  async _parse(string,url){
    let store =[]
    const parser = new N3.Parser({ baseIRI: url });
    return new Promise( async(resolve)=>{
      parser.parse( string, (err, quad, prefixes) => {
        if(quad) {
           store.push(quad)        
        }
        if(err) return resolve(err);
        resolve(store)
      })
    })
  }

}

export default RdfQuery

