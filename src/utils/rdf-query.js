const N3 = require('n3')
const ns = require('solid-namespace')()

const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;

class RdfQuery {

  constructor(fetch) {
    this._fetch = fetch
    this.parser = new N3.Parser()
    this.store   = new N3.Store()
    this.prefix = {}
  }

  /**
   * @param {string} prefix 
   * @param {string} url 
   */
  setPrefix(prefix,url){
    this.prefix[prefix]=url
  }
  /**
   * @param {string} prefix 
   * @returns {string} url 
   */
  getPrefix(prefix){
    return this.prefix[prefix]
  }

  // TBD: What types are these? What does it return?
  // TBD: Remove outdated comments and mungeLiteral (which is unused)
  /**
   * TBD: Add description
   * @param {string} source url to the turtle file
   * @param {any} s 
   * @param {any} p 
   * @param {any} o 
   * @param {any} g 
   * @returns {N3.Quad[]}
   */
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
    // TBD: What is the point of querying an empty source?
    // TBD: Could be rewritten as
    // const store = source ? await this.loadFromUrl(source) : new N3.Store()
    // then we wouldn't need this.store
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

  // TBD: This method is not used anywhere. Do we still need it? Is it public?
  /**
   * TBD: Add description what it does (and the params are good for)
   * @param {string} string some string (content of the rdf file?)
   * @param {string} url some url (to the rdf file?)
   * @returns {Promise<N3.N3Store>} 
   */
  async loadFromString(string,url){
    // TBD: Same as:?
    // await this._load(string, url)
    // return this.store
    return new Promise( async(resolve)=>{
      await this._load(string,url)
      return resolve(this.store)
    })
  }

  // TBD: This method is not used anywhere. Do we still need it? Is it public?
  /**
   * TBD: Add description what it does
   * @param {string} url some url (to the rdf file?)
   * @returns {Promise<N3.N3Store>}
   */
  async load(url) {
    let store = await this.loadFromUrl(url)
    store.query = this.query
    return store
  }
 
  /**
   * Fetch turtle file and parse the quads
   * TBD: Mark as private?
   * @param {string} url
   * @returns {Promise<N3.N3Store>}
   */
  async loadFromUrl(url) {
    const res = await this._fetch(url, { headers: { "Accept": "text/turtle" }})   // needed for https://<podName>/ when there is an index.html
    if (!res.ok) {
      throw res
    }
    const string = await res.text()
    // TBD: Why saving it in this.store instead of returing it directly?
    this.store = await this._load(string, url)
    return this.store
  }

  /**
   * // TBD: Why not directly add to a N3.Store in the _parse method? Then we wouldn't need this method
   * Parse quads from rdf
   * @private
   * @param {string} string rdf
   * @param {string} url url of the turtle file
   * @returns {Promise<N3.N3Store>}
   */
  async _load(string,url){
    // TBD: Remove new Promise and resolve
    return new Promise( async(resolve)=>{
      let quads =  await this._parse(string,url)
      // TBD: What happens when _load is called for two different files at the same time?
      //      Are the results getting merged because it is done at the same time?
      //      Consider creating a new store and returning it. Binding it to RdfQuery seems error prone to me
      this.store.addQuads(quads)
      return resolve(this.store)
    })
  }

  /**
   * TBD: Check if this is accurate
   * @param {string} string rdf 
   * @param {string} url url of the turtle file
   * @returns {N3.Quad[]}
   */
  async _parse(string,url){
    let store =[]
    const parser = new N3.Parser({ baseIRI: url });
    return new Promise( async(resolve)=>{
      parser.parse( string, (err, quad, prefixes) => {
        if(quad) {
           store.push(quad)        
        }
        // TBD: Why resolve with an error instead of rejecting?
        if(err) return resolve(err);
        // TBD: Shouldn't we wait until all quads are parsed before resolving?
        //      When parse is finished it invokes the callback a last time with quad=null
        //      So I'd suggest: if (!quad) resolve(store)
        resolve(store)
      })
    })
  }

}

export default RdfQuery

