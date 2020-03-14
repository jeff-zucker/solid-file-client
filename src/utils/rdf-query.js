/*
 *  rdf-query - a minimal library that uses N3 to query rdf files
 *
 *  by Jeff Zucker with contributions from Otto_A_A and Alain Bourgeois
 *  &copy; 2019, Jeff Zucker, may be freely distributed using an MIT license
 */
import * as N3 from 'n3';
import solidNS from 'solid-namespace';

const ns = solidNS();

const { DataFactory } = N3
const { namedNode, literal } = DataFactory

class RdfQuery {
  constructor (fetch) {
    this._fetch = fetch
    this.parser = new N3.Parser()
    this.store = new N3.Store()
    /** @type {Object.<string, N3.N3Store>} */
    this.cache = {}
    this.prefix = {}
  }

  /**
   * @param {string} prefix
   * @param {string} url
   */
  setPrefix (prefix, url) {
    this.prefix[prefix] = url
  }

  /**
   * @param {string} prefix
   * @returns {string} url
   */
  getPrefix (prefix) {
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
  async query (source, s, p, o, g, { useCache } = { useCache: true }) {
    if (useCache && source in this.cache) { return this._queryCached(source, s, p, o, g) }

    const res = await this._fetch(source, {
      headers: { Accept: 'text/turtle' }
    })
    const turtle = await res.text()

    return this.queryTurtle(source, turtle, s, p, o, g)
  }

  /**
   * @param {string} url
   * @param {string} turtle
   * @param {string} s
   * @param {string} p
   * @param {string} o
   * @param {string} g
   * @returns {N3.Quad[]}
   */
  async queryTurtle (url, turtle, s, p, o, g) {
    const store = await this._parse(turtle, url)
    this.cache[url] = store

    return this._queryCached(url, s, p, o, g)
  }

  /***
   * @private
   * @param {string} url
   * @param {string} s
   * @param {string} p
   * @param {string} o
   * @param {string} g
   * @returns {N3.Quad[]}
   */
  async _queryCached (url, s, p, o, g) {
    if (!g) {
      g = namedNode(url)
        [s, p, o, g] = [s, p, o, g].map(term => {
          if (typeof term === 'object' && term) {
            if (term.id) return term // already a namedNode
            const prefix = Object.keys(term) // a hash to munge into a namedNode
            const value = term[prefix]
            if (prefix.length === 1 && prefix[0] === 'thisDoc') {
              if (value) return namedNode(url + '#' + value)
              else return namedNode(url)
            }
            if (ns[prefix]) return namedNode(ns[prefix](value))
            if (this.prefix[prefix]) return namedNode(this.prefix[prefix] + value)
            return namedNode(prefix + value)
          }
          if (term && typeof term !== 'undefined') return literal(term) // literal
          return term // undefined or null
        })
    }

    const store = this.cache[url]
    return store.getQuads(g[0], g[1], g[2], g[3])
  }

  /**
   * @param {string} string rdf
   * @param {string} url url of the turtle file
   * @returns {N3.Quad[]}
   */
  async _parse (string, url) {
    const quadsArray = []
    const parser = new N3.Parser({ baseIRI: url })
    return new Promise((resolve, reject) => {
      parser.parse(string, (err, quad, prefixes) => {
        if (quad) {
          quadsArray.push(quad)
        }
        if (err) return reject(err)
        if (!quad) {
          const store = new N3.Store()
          store.addQuads(quadsArray)
          resolve(store)
        }
      })
    })
  }
}

export default RdfQuery
// module.exports = RdfQuery  // how do I make this work in nodejs???
