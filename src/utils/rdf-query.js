/*
 *  rdf-query - a minimal library that uses N3 to query rdf files
 *
 *  by Jeff Zucker with contributions from Otto_A_A and Alain Bourgeois
 *  &copy; 2019, Jeff Zucker, may be freely distributed using an MIT license
 */
import * as N3 from 'n3'
import solidNS from 'solid-namespace'

const { DataFactory } = N3
const { namedNode, literal } = DataFactory
const ns = solidNS()

const solidPrefixes = Object.keys(ns)
const termType = ['subject', 'predicate', 'object', 'graph']

/**
 * minimal class to query, edit and write rdf files content in N3 store
 * using solid-namespace to access namedNode, literal
 * @alias 'solidAPI.rdf'
 */
class RdfQuery {
  constructor (fetch) {
    this._fetch = fetch
    this.parser = new N3.Parser()
    this.store = new N3.Store()
    /**
     * cache of N3.store : cache[url] is the store of url
     * example :
     *  - to add a quadsArray to the store : cache[url].addQuads(quadsArray)
     *  - all N3 store functions can be used
     * @type {Object.<string, N3.N3Store>}
     */
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
   *   - {somePrefix:someTerm}
   *     somePrefix is then replaced using URLs from solid-namespace
   *     the special prefix thisDoc {thisDoc:me} uses current doc as namespace
   *   - N3 quad subject, predicate, object and optional graph
   * @param {string} source url to the turtle file
   * @param {null|string|object} s subject
   * @param {null|string|object} p predicate
   * @param {null|string|object} o object
   * @param {null|string|object} g graph
   * @returns {N3.Quad[]}
   */
  async query (source, s, p, o, g, { useCache } = { useCache: true }) {
    try {
      if (useCache && source in this.cache) { return this._queryCached(source, s, p, o, g) }
      await this.parseUrl(source)
      return this._queryCached(source, s, p, o, g)
    } catch (e) { throw new Error(e.message) }
  }

  /**
   * @param {string} url of cache[url]
   * @param {string} turtle
   * @param {null|string|object} s subject
   * @param {null|string|object} p predicate
   * @param {null|string|object} o object
   * @param {null|string|object} g graph
   * @returns {N3.Quad[]}
   */
  async queryTurtle (url, turtle, s, p, o, g) {
    try {
      await this.parse(url, turtle, { baseIRI: url })
      return this._queryCached(url, s, p, o, g)
    } catch (e) { throw new Error(e.message) }
  }

  /***
   * @private
   * @param {string} url of cache[url]
   * @param {null|string|object} s subject
   * @param {null|string|object} p predicate
   * @param {null|string|object} o object
   * @param {null|string|object} g graph
   * @returns {N3.Quad[]}
   */
  async _queryCached (url, s, p, o, g) {
    g = this._solidNsToQuad(url, s, p, o, g)

    const store = this.cache[url]
    return store.getQuads(g[0], g[1], g[2], g[3])
  }

  _solidNsToQuad (url, s, p, o, g) {
    if (g === 'undefined' || g === undefined) g = null // return all graphs, g cannot be undefined
    return [s, p, o, g] = [s, p, o, g].map(term => {
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
      if (term && typeof term !== 'undefined') {
        if (term.startsWith('<') && term.endsWith('>')) return namedNode(term.substring(1, term.length - 1))
        else return literal(term) // literal
      }
      return term // undefined or null
    })
  }

  /**
   * fetch url, parse and create cache[url]=N3.store
   * @param {string} url
   * @returns {cache.url.<N3.store>} store=cache[url]
   */
  async parseUrl (url) {
    try {
      const res = await this._fetch(url, {
        headers: { Accept: ['text/turtle', 'text/n3'] } // a revoir
      })
      const turtle = await res.text()
      const contentType = res.headers.get('content-type').split(';')[0]
      const options = {
        baseIRI: url,
        format: contentType
      }
      return await this.parse(url, turtle, options)
    } catch (e) { throw new Error(e.message) }
  }

  /**
   * parse RDF and create cache[url]=N3.store
   * @param {string} url
   * @param {string} turtle
   * @param {object} [options] for N3.parser
   * @property {options.baseIRI} document url
   * @property {options.format} allowed RDF format
   * @returns {cache.url.<N3.store>} store=cache[url]
   */
  async parse (url, turtle, options) {
    options = {
      baseIRI: url,
      format: 'text/turtle',
      ...options
    }
    try {
      const store = await this._parse(turtle, options)
      this.cache[url] = store
      return store
    } catch (e) { throw new Error(e.message) }
  }

  async _parse (string, options) {
    const quadsArray = []
    const parser = new N3.Parser(options)
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

  /**
   * add quad to cache[url] store with special solid syntax
   * @param {string} url of cache[url]
   * @param {null|string|object} s subject
   * @param {null|string|object} p predicate
   * @param {null|string|object} o object
   * @param {null|string|object} g graph
   */
  async addQuad (url, s, p, o, g) {
    [s, p, o].map(term => { if (!term) throw new Error('400 : triple must be defined') })
    g = this._solidNsToQuad(url, s, p, o, g)

    const store = this.cache[url]
    return store.addQuad(g[0], g[1], g[2], g[3])
  }

  /**
   * remove matching quads from cache[url] store using special solid syntax
   * @param {string} url of cache[url]
   * @param {null|string|object} s subject
   * @param {null|string|object} p predicate
   * @param {null|string|object} o object
   * @param {null|string|object} g graph
   */
  async removeMatches (url, s, p, o, g) {
    g = this._solidNsToQuad(url, s, p, o, g)
    const store = this.cache[url]
    const quadsArray = await store.getQuads(g[0], g[1], g[2], g[3])
    return store.removeQuads(quadsArray)
  }

  /**
   * Write RDF content from cache[url] store with N3.writer
   * using relative notation to baseIRI
   *
   * @param {string} url : to access cache[url]
   * @param {object} [options]
   * @property {options.format.<string>} N3.witer allowed rdf contentType default 'text/turtle'
   * @property {options.prefixes.<object>} N3.writer prefixes
   * @property {options.prefix.<string>} one of termType used to build automatic prefixes default 'predicate'
   * @property {options.baseIRI.<string>} document baseIRI to use relative notation with 'text/turtle'
   * @returns {document.<string>} RDF document
   */
  async write (url, options) {
    options = {
      format: 'text/turtle',
      // baseIRI: url,
      prefix: 'predicate',
      ...options
    }
    const quadsArray = await this._queryCached(url)
    const prefixes = await this._getPrefixes(url, options)
    const prefix = { ...prefixes, ...options.prefixes }
    options = { ...options, prefixes: prefix }
    let turtle = await this.writeQuads(quadsArray, options)
    if (options.baseIRI && options.format === 'text/turtle') turtle = this._makeRelativeUrl(turtle, options.baseIRI) //, options.prefix)
    return turtle
  }

  /**
   * Write RDF content from regular array of quads
   * @param {array} quadsArray
   * @param {object} options for N3.Writer
   * @property {options.format}
   * @property {options.prefixes}
   * @returns {document.<string>} RDF document
   */
  async writeQuads (quadsArray, options) {
    options = {
      format: 'text/turtle',
      ...options
    }
    const writer = new N3.Writer(options)
    // Remove any potentially lingering references to Documents in Quads;
    // they'll be determined by the URL the Turtle will be sent to:
    const triples = quadsArray.map(quad => DataFactory.triple(quad.subject, quad.predicate, quad.object))
    writer.addQuads(triples)
    const writePromise = new Promise((resolve, reject) => {
      writer.end((error, result) => {
        if (error) {
          return reject(error) // or 400 : 'error'
        }
        resolve(result)
      })
    })

    const turtle = await writePromise
    return turtle
  }

  /**
   * get the list of NamedNode prefixes using solidNames for an url or cache[url] store
   * example : list of NamedNode predicates
   * @param {string} url
   * @param {object} options
   * @property {options.prefix} 'subject'|'predicate'|'object'
   * @property {options.baseIRI} excludes baseIRI from prefixes to allow make relative in write
   * @returns {object} prefixes
   */
  async _getPrefixes (url, options) {
    const type = options.prefix
    const quads = await this.query(url)
    let typeList = await this._getTermList(type, quads)
    const pred = new Set()
    const prefixes = {}
    const baseIRI = options.baseIRI ? options.baseIRI.substring(0, options.baseIRI.lastIndexOf('/') + 1) : ''

    typeList = typeList.map(item => {
      // if baseIRI do not include as prefix
      if (!(baseIRI && item.includes(baseIRI))) {
        let test = ''
        // find solid NamedNode terms
        for (const i in solidPrefixes) {
          if (item.indexOf(ns[solidPrefixes[i]]('')) === 0) {
            test = solidPrefixes[i]
            // exclude rdf http://www.w3.org/1999/02/22-rdf-syntax-ns#
            if (test !== 'rdf') prefixes[test] = ns[test]('')
            break
          }
        }
        // create other namedNode terms
        if (!test) {
          const itemSplit = (string) => {
            const i = item.lastIndexOf(string)
            if (i !== -1) return item.substring(0, i + 1)
          }
          const res = itemSplit('#') ? itemSplit('#') : (itemSplit('/') ? itemSplit('/') : '')
          if (res) {
            pred.add(res)
          }
        }
      }
    })

    const types = [...pred]
    // const t = type.substring(0, 1)
    for (const i in types) {
      prefixes['n' + i] = types[i]
    }
    return prefixes
  }

  /**
   * List of 'namedNode' values for a type of termType
   * @param {"subject"|"predicate"|"object"} type
   * @param {array} quadsArray
   */
  async _getTermList (type, quadsArray) {
    const res = termType.find(term => term === type)
    if (!res) throw (new Error(`400 : invalid termType : ${type}`))
    const getList = {}
    for (const i in quadsArray) {
      const term = quadsArray[i][type].value
      if (quadsArray[i][type].termType === 'NamedNode') getList[term] = '' // quadsArray[i][type].termType
    }
    return Object.keys(getList)
  }

  /**
   * Make turtle content relative to an url resource
   * - make absolute paths relative to document
   * @param {string} turtle
   * @param {string} url resource url
   * @returns {string} turtle
   */
  _makeRelativeUrl (turtle, url) {
    const folder = url.substring(0, url.lastIndexOf('/') + 1)
    if (turtle.includes(url)) {
      if (turtle.includes(url + '#')) turtle = '@prefix : <#>.\n' + turtle
      turtle = turtle.replace(new RegExp(`<${url}#(.*?)>`, 'g'), ':$1') // ':$1') // replace url with fragment
      turtle = turtle.replace(new RegExp(`<${url}>`, 'g'), '<>') // ':$1') // replace url
    }
    if (turtle.includes(folder)) {
      turtle = turtle.replace(new RegExp(`<${folder}(.*?)>`, 'g'), '<./$1>')
      // or the 2 lines
      // turtle = '@prefix c: <./>.\n' + turtle
      // turtle = turtle.replace(new RegExp(`<${folder}(.*?)>`, 'g'), 'c:$1') // ':$1') // replace folder
    }
    return turtle
  }
}

export default RdfQuery
// module.exports = RdfQuery  // how do I make this work in nodejs???
