/*
 *  rdf-query - a minimal library that uses N3 to query rdf files
 *
 *  by Jeff Zucker with contributions from Otto_A_A and Alain Bourgeois
 *  &copy; 2019, Jeff Zucker, may be freely distributed using an MIT license
 */
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

  /**
   * loads a Turtle file, parses it, returns an array of quads
   * expects URL of a source file, if empty, uses previously loaded file
   * expects Turtle strings for subject, predicate, object, & optional graph
   * supports this non-standard syntax for Turtle strings - 
   *     {somePrefix:someTerm}
   *     somePrefix is then replaced using URLs from solid-namespace
   *     the special prefix thisDoc {thisDoc:me} uses current doc as namespace
   * @param {sting} source url to the turtle file
   * @param {string} s 
   * @param {string} p 
   * @param {string} o 
   * @param {string} g 
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
      if(term && typeof term !="undefined") return literal(term)  // literal
      return term                                         // undefined or null
    })
    if(source) this.store = new N3.Store()
    /*
      if no source is given, use the file that was previously loaded into this.store
    */
    let store = source ? await this._loadFromUrl(source) :this.store
    let matches = await store.getQuads(g[0],g[1],g[2],g[3])
    return matches

  }

  /**
   * Fetch turtle file and parse the quads
   * @param {string} url
   * @returns {Promise<N3.N3Store>}
  */
  async _loadFromUrl(url) {
    // TBD: Should fail when the server responds with text/html
    const res = await this._fetch(url, { 
        headers: { "Accept": "text/turtle" }
    })    // needed for https://<podName>/ when there is an index.html
    if (!res.ok) {
      throw res
    }
    const string = await res.text()
    /*
       save loaded file in this.store so we can later re-query w/o reloading
    */
    this.store = await this._parse(string, url)
    return this.store
  }

  /**
   * @param {string} string rdf 
   * @param {string} url url of the turtle file
   * @returns {N3.Quad[]}
   */
  async _parse(string,url){
    let quadsArray = []
    const parser = new N3.Parser({ baseIRI: url });
    return new Promise( async(resolve)=>{
      parser.parse( string, (err, quad, prefixes) => {
        if(quad) {
           quadsArray.push(quad)        
        }
        if(err) return reject(err);
        if(!quad) {
          let store = new N3.Store()
          store.addQuads(quadsArray)
          resolve(store)
        }
      })
    })
  }

}

export default RdfQuery
// module.exports = RdfQuery  // how do I make this work in nodejs???
