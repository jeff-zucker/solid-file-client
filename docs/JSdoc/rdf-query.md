<a name="solidAPI.rdf"></a>

## solidAPI.rdf
minimal class to query, edit and write rdf files content in N3 store
using solid-namespace to access namedNode, literal

**Kind**: global class  

* [solidAPI.rdf](#solidAPI.rdf)
    * [.cache](#solidAPI.rdf+cache) : <code>Object.&lt;string, N3.N3Store&gt;</code>
    * [.setPrefix(prefix, url)](#solidAPI.rdf+setPrefix)
    * [.getPrefix(prefix)](#solidAPI.rdf+getPrefix) ⇒ <code>string</code>
    * [.query(source, s, p, o, g)](#solidAPI.rdf+query) ⇒ <code>Array.&lt;N3.Quad&gt;</code>
    * [.queryTurtle(url, turtle, s, p, o, g)](#solidAPI.rdf+queryTurtle) ⇒ <code>Array.&lt;N3.Quad&gt;</code>
    * [.parseUrl(url)](#solidAPI.rdf+parseUrl) ⇒ <code>cache.url.&lt;N3.store&gt;</code>
    * [.parse(url, turtle, [options])](#solidAPI.rdf+parse) ⇒ <code>cache.url.&lt;N3.store&gt;</code>
    * [.addQuad(url, s, p, o, g)](#solidAPI.rdf+addQuad)
    * [.removeMatches(url, s, p, o, g)](#solidAPI.rdf+removeMatches)
    * [.write(url, [options])](#solidAPI.rdf+write) ⇒ <code>document.&lt;string&gt;</code>
    * [.writeQuads(quadsArray, options)](#solidAPI.rdf+writeQuads) ⇒ <code>document.&lt;string&gt;</code>
    * [._getPrefixes(url, options)](#solidAPI.rdf+_getPrefixes) ⇒ <code>object</code>
    * [._getTermList(type, quadsArray)](#solidAPI.rdf+_getTermList)
    * [._makeRelativeUrl(turtle, url)](#solidAPI.rdf+_makeRelativeUrl) ⇒ <code>string</code>

<a name="solidAPI.rdf+cache"></a>

### solidAPI.rdf.cache : <code>Object.&lt;string, N3.N3Store&gt;</code>
cache of N3.store : cache[url] is the store of url
example :
 - to add a quadsArray to the store : cache[url].addQuads(quadsArray)
 - all N3 store functions can be used

**Kind**: instance property of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
<a name="solidAPI.rdf+setPrefix"></a>

### solidAPI.rdf.setPrefix(prefix, url)
**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type |
| --- | --- |
| prefix | <code>string</code> | 
| url | <code>string</code> | 

<a name="solidAPI.rdf+getPrefix"></a>

### solidAPI.rdf.getPrefix(prefix) ⇒ <code>string</code>
**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>string</code> - url  

| Param | Type |
| --- | --- |
| prefix | <code>string</code> | 

<a name="solidAPI.rdf+query"></a>

### solidAPI.rdf.query(source, s, p, o, g) ⇒ <code>Array.&lt;N3.Quad&gt;</code>
loads a Turtle file, parses it, returns an array of quads
expects URL of a source file, if empty, uses previously loaded file
expects Turtle strings for subject, predicate, object, & optional graph
supports this non-standard syntax for Turtle strings -
  - {somePrefix:someTerm}
    somePrefix is then replaced using URLs from solid-namespace
    the special prefix thisDoc {thisDoc:me} uses current doc as namespace
  - N3 quad subject, predicate, object and optional graph

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type | Description |
| --- | --- | --- |
| source | <code>string</code> | url to the turtle file |
| s | <code>null</code> \| <code>string</code> \| <code>object</code> | subject |
| p | <code>null</code> \| <code>string</code> \| <code>object</code> | predicate |
| o | <code>null</code> \| <code>string</code> \| <code>object</code> | object |
| g | <code>null</code> \| <code>string</code> \| <code>object</code> | graph |

<a name="solidAPI.rdf+queryTurtle"></a>

### solidAPI.rdf.queryTurtle(url, turtle, s, p, o, g) ⇒ <code>Array.&lt;N3.Quad&gt;</code>
**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | of cache[url] |
| turtle | <code>string</code> |  |
| s | <code>null</code> \| <code>string</code> \| <code>object</code> | subject |
| p | <code>null</code> \| <code>string</code> \| <code>object</code> | predicate |
| o | <code>null</code> \| <code>string</code> \| <code>object</code> | object |
| g | <code>null</code> \| <code>string</code> \| <code>object</code> | graph |

<a name="solidAPI.rdf+parseUrl"></a>

### solidAPI.rdf.parseUrl(url) ⇒ <code>cache.url.&lt;N3.store&gt;</code>
fetch url, parse and create cache[url]=N3.store

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>cache.url.&lt;N3.store&gt;</code> - store=cache[url]  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="solidAPI.rdf+parse"></a>

### solidAPI.rdf.parse(url, turtle, [options]) ⇒ <code>cache.url.&lt;N3.store&gt;</code>
parse RDF and create cache[url]=N3.store

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>cache.url.&lt;N3.store&gt;</code> - store=cache[url]  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> |  |
| turtle | <code>string</code> |  |
| [options] | <code>object</code> | for N3.parser |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| document | <code>options.baseIRI</code> | url |
| allowed | <code>options.format</code> | RDF format |

<a name="solidAPI.rdf+addQuad"></a>

### solidAPI.rdf.addQuad(url, s, p, o, g)
add quad to cache[url] store with special solid syntax

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | of cache[url] |
| s | <code>null</code> \| <code>string</code> \| <code>object</code> | subject |
| p | <code>null</code> \| <code>string</code> \| <code>object</code> | predicate |
| o | <code>null</code> \| <code>string</code> \| <code>object</code> | object |
| g | <code>null</code> \| <code>string</code> \| <code>object</code> | graph |

<a name="solidAPI.rdf+removeMatches"></a>

### solidAPI.rdf.removeMatches(url, s, p, o, g)
remove matching quads from cache[url] store using special solid syntax

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | of cache[url] |
| s | <code>null</code> \| <code>string</code> \| <code>object</code> | subject |
| p | <code>null</code> \| <code>string</code> \| <code>object</code> | predicate |
| o | <code>null</code> \| <code>string</code> \| <code>object</code> | object |
| g | <code>null</code> \| <code>string</code> \| <code>object</code> | graph |

<a name="solidAPI.rdf+write"></a>

### solidAPI.rdf.write(url, [options]) ⇒ <code>document.&lt;string&gt;</code>
Write RDF content from cache[url] store with N3.writer
using relative notation to baseIRI

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>document.&lt;string&gt;</code> - RDF document  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | : to access cache[url] |
| [options] | <code>object</code> |  |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| N3.witer | <code>options.format.&lt;string&gt;</code> | allowed rdf contentType default 'text/turtle' |
| N3.writer | <code>options.prefixes.&lt;object&gt;</code> | prefixes |
| one | <code>options.prefix.&lt;string&gt;</code> | of termType used to build automatic prefixes default 'predicate' |
| document | <code>options.baseIRI.&lt;string&gt;</code> | baseIRI to use relative notation with 'text/turtle' |

<a name="solidAPI.rdf+writeQuads"></a>

### solidAPI.rdf.writeQuads(quadsArray, options) ⇒ <code>document.&lt;string&gt;</code>
Write RDF content from regular array of quads

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>document.&lt;string&gt;</code> - RDF document  

| Param | Type | Description |
| --- | --- | --- |
| quadsArray | <code>array</code> |  |
| options | <code>object</code> | for N3.Writer |

**Properties**

| Type |
| --- |
| <code>options.format</code> | 
| <code>options.prefixes</code> | 

<a name="solidAPI.rdf+_getPrefixes"></a>

### solidAPI.rdf.\_getPrefixes(url, options) ⇒ <code>object</code>
get the list of NamedNode prefixes using solidNames for an url or cache[url] store
example : list of NamedNode predicates

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>object</code> - prefixes  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| options | <code>object</code> | 

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| 'subject'|'predicate'|'object' | <code>options.prefix</code> |  |
| excludes | <code>options.baseIRI</code> | baseIRI from prefixes to allow make relative in write |

<a name="solidAPI.rdf+_getTermList"></a>

### solidAPI.rdf.\_getTermList(type, quadsArray)
List of 'namedNode' values for a type of termType

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  

| Param | Type |
| --- | --- |
| type | <code>&quot;subject&quot;</code> \| <code>&quot;predicate&quot;</code> \| <code>&quot;object&quot;</code> | 
| quadsArray | <code>array</code> | 

<a name="solidAPI.rdf+_makeRelativeUrl"></a>

### solidAPI.rdf.\_makeRelativeUrl(turtle, url) ⇒ <code>string</code>
Make turtle content relative to an url resource
- make absolute paths relative to document

**Kind**: instance method of [<code>solidAPI.rdf</code>](#solidAPI.rdf)  
**Returns**: <code>string</code> - turtle  

| Param | Type | Description |
| --- | --- | --- |
| turtle | <code>string</code> |  |
| url | <code>string</code> | resource url |

