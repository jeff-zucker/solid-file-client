## Classes

<dl>
<dt><a href="#SolidAPI">SolidAPI</a></dt>
<dd></dd>
<dt><a href="#SolidFileClient">SolidFileClient</a> ⇐ <code>SolidApi</code></dt>
<dd><p>Class for working with files on Solid Pods</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#defaultPopupUri">defaultPopupUri</a></dt>
<dd><p>TBD
maybe eventually reintroduce the fetch API response interface
for now throwErrors will be the only option so no need for this line
const defaultInitOptions = { throwErrors:false }</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#WriteOptions">WriteOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SolidApiOptions">SolidApiOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Item">Item</a></dt>
<dd></dd>
<dt><a href="#FolderData">FolderData</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#fetch">fetch</a> ⇒ <code>Promise.&lt;Response&gt;</code></dt>
<dd><p>(optionally authenticated) fetch method similar to window.fetch</p>
</dd>
<dt><a href="#SessionAuthorization">SessionAuthorization</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#Session">Session</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#fetch">fetch</a> ⇒ <code>Promise.&lt;Response&gt;</code></dt>
<dd><p>(optionally authenticated) fetch method similar to window.fetch</p>
</dd>
<dt><a href="#SolidAuthClient">SolidAuthClient</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SolidFileClientOptions">SolidFileClientOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#LoginCredentials">LoginCredentials</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="SolidAPI"></a>

## SolidAPI
**Kind**: global class  

* [SolidAPI](#SolidAPI)
    * [new SolidAPI(fetch, [options])](#new_SolidAPI_new)
    * [.fetch(url, [options])](#SolidAPI+fetch) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.get(url, [options])](#SolidAPI+get) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.delete(url, [options])](#SolidAPI+delete) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.post(url, [options])](#SolidAPI+post) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.put(url, [options])](#SolidAPI+put) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.patch(url, [options])](#SolidAPI+patch) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.head(url, [options])](#SolidAPI+head) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.options(url, [options])](#SolidAPI+options) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.itemExists(url)](#SolidAPI+itemExists) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.createItem(url, content, contentType, link, [options])](#SolidAPI+createItem) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.createFolder(url, [options])](#SolidAPI+createFolder) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.createFile(url, content, [options])](#SolidAPI+createFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.putFile(url, content, [options])](#SolidAPI+putFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.readFolder(url)](#SolidAPI+readFolder) ⇒ [<code>Promise.&lt;FolderData&gt;</code>](#FolderData)
    * [.copyFile(from, to, [options])](#SolidAPI+copyFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.copyFolder(from, to, [options])](#SolidAPI+copyFolder) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.copy(from, to, [options])](#SolidAPI+copy) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.deleteFolderContents(url)](#SolidAPI+deleteFolderContents) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.deleteFolderRecursively(url)](#SolidAPI+deleteFolderRecursively) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.move(from, to, [options])](#SolidAPI+move) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.rename(url, newName, [options])](#SolidAPI+rename) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>

<a name="new_SolidAPI_new"></a>

### new SolidAPI(fetch, [options])
Provide API methods which use the passed fetch method


| Param | Type |
| --- | --- |
| fetch | [<code>fetch</code>](#fetch) | 
| [options] | [<code>SolidApiOptions</code>](#SolidApiOptions) | 

<a name="SolidAPI+fetch"></a>

### solidAPI.fetch(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Fetch a resource with the passed fetch method

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - resolves if response.ok is true, else rejects the response  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+get"></a>

### solidAPI.get(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send get request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+delete"></a>

### solidAPI.delete(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send delete request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+post"></a>

### solidAPI.post(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send post request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+put"></a>

### solidAPI.put(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send put request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+patch"></a>

### solidAPI.patch(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send patch request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+head"></a>

### solidAPI.head(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send head request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+options"></a>

### solidAPI.options(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send options request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+itemExists"></a>

### solidAPI.itemExists(url) ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if item exists

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 

**Todo**

- [ ] Discuss how it should behave on 403, etc


| Param | Type |
| --- | --- |
| url | <code>string</code> | 

**Example**  
```js
if (await api.itemExists(url)) {
  // Do something
} else {
  // Do something else
}
```
<a name="SolidAPI+createItem"></a>

### solidAPI.createItem(url, content, contentType, link, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create an item at target url.
Per default it will create the parent folder if it doesn't exist.
Per default existing items will be replaced.
You can modify this default behaviour with the options

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> |  |
| content | <code>Blob</code> \| <code>string</code> |  |
| contentType | <code>string</code> |  |
| link | <code>string</code> | header for Container/Resource, see LINK in apiUtils |
| [options] | [<code>WriteOptions</code>](#WriteOptions) |  |

<a name="SolidAPI+createFolder"></a>

### solidAPI.createFolder(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a folder if it doesn't exist.
Per default it will resolve when the folder already existed

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - Response of HEAD request if it already existed, else of creation request  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+createFile"></a>

### solidAPI.createFile(url, content, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a new file.
Per default it will overwrite existing files

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| content | <code>Blob</code> \| <code>String</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+putFile"></a>

### solidAPI.putFile(url, content, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a file using PUT
Per default it will overwrite existing files

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| content | <code>Blob</code> \| <code>String</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+readFolder"></a>

### solidAPI.readFolder(url) ⇒ [<code>Promise.&lt;FolderData&gt;</code>](#FolderData)
Fetch and parse a folder

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+copyFile"></a>

### solidAPI.copyFile(from, to, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Copy a file.
Overwrites per default

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - - Response from the new file created  
**Throws**:

- <code>Response</code><code>Error</code> 


| Param | Type | Description |
| --- | --- | --- |
| from | <code>string</code> | Url where the file currently is |
| to | <code>string</code> | Url where it should be copied to |
| [options] | [<code>WriteOptions</code>](#WriteOptions) |  |

<a name="SolidAPI+copyFolder"></a>

### solidAPI.copyFolder(from, to, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Copy a folder and all contents.
Overwrites files per default.
Merges folders if already existing

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of creation responses.
The first one will be the folder specified by "to".
The others will be creation responses from the contents in arbitrary order.  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| from | <code>string</code> | 
| to | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+copy"></a>

### solidAPI.copy(from, to, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Copy a file (url ending with file name) or folder (url ending with "/").
Overwrites files per default.
Merges folders if already existing

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of creation responses.
The first one will be the folder specified by "to".
If it is a folder, the others will be creation responses from the contents in arbitrary order.  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| from | <code>string</code> | 
| to | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+deleteFolderContents"></a>

### solidAPI.deleteFolderContents(url) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Delete all folders and files inside a folder

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with a response for each deletion request  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+deleteFolderRecursively"></a>

### solidAPI.deleteFolderRecursively(url) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Delete a folder and its contents recursively

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of deletion responses.
The first one will be the folder specified by "url".
The others will be the deletion responses from the contents in arbitrary order  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+move"></a>

### solidAPI.move(from, to, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Move a file (url ending with file name) or folder (url ending with "/").
Shortcut for copying and deleting items

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Responses of the newly created items  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| from | <code>string</code> | 
| to | <code>string</code> | 
| [options] | <code>RequestOptions</code> | 

<a name="SolidAPI+rename"></a>

### solidAPI.rename(url, newName, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Rename a file (url ending with file name) or folder (url ending with "/").
Shortcut for moving items within the same directory

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Response of the newly created items  
**Throws**:

- <code>Array.&lt;Response&gt;</code><code>Error</code> if one or more fetch requests failed an array of the responses.


| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| newName | <code>string</code> | 
| [options] | <code>RequestOptions</code> | 

<a name="SolidFileClient"></a>

## SolidFileClient ⇐ <code>SolidApi</code>
Class for working with files on Solid Pods

**Kind**: global class  
**Extends**: <code>SolidApi</code>  

* [SolidFileClient](#SolidFileClient) ⇐ <code>SolidApi</code>
    * [new SolidFileClient(auth, [options])](#new_SolidFileClient_new)
    * [.login(credentials)](#SolidFileClient+login) ⇒ [<code>Promise.&lt;Session&gt;</code>](#Session)
    * [.popupLogin([popupUri])](#SolidFileClient+popupLogin) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.checkSession()](#SolidFileClient+checkSession) ⇒ <code>Promise.&lt;(Session\|undefined)&gt;</code>
    * [.currentSession()](#SolidFileClient+currentSession) ⇒ <code>Promise.&lt;(Session\|undefined)&gt;</code>
    * [.getCredentials(fn)](#SolidFileClient+getCredentials) ⇒ <code>object</code>
    * [.logout()](#SolidFileClient+logout) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.readFile(url, [request])](#SolidFileClient+readFile) ⇒ <code>Promise.&lt;(string\|Response\|Blob)&gt;</code>
    * [.fetchAndParse(url, [contentType])](#SolidFileClient+fetchAndParse) ⇒ <code>Promise.&lt;object&gt;</code>

<a name="new_SolidFileClient_new"></a>

### new SolidFileClient(auth, [options])

| Param | Type | Description |
| --- | --- | --- |
| auth | [<code>SolidAuthClient</code>](#SolidAuthClient) | An auth client, for instance solid-auth-client or solid-auth-cli |
| [options] | [<code>SolidFileClientOptions</code>](#SolidFileClientOptions) |  |

**Example**  
```js
const { auth } = require('solid-auth-client')
const fileClient = new SolidFileClient(auth)
await fileClient.popupLogin()
fileClient.createFolder('https:/.../foo/bar/')
  .then(response => console.log(`Created: ${response.url}`))
```
<a name="SolidFileClient+login"></a>

### solidFileClient.login(credentials) ⇒ [<code>Promise.&lt;Session&gt;</code>](#Session)
Redirect the user to a login page if in the browser
or login directly from command-line or node script

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  

| Param | Type |
| --- | --- |
| credentials | [<code>LoginCredentials</code>](#LoginCredentials) | 

<a name="SolidFileClient+popupLogin"></a>

### solidFileClient.popupLogin([popupUri]) ⇒ <code>Promise.&lt;string&gt;</code>
Open a popup prompting the user to login

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  
**Returns**: <code>Promise.&lt;string&gt;</code> - resolves with the webId after a
successful login  

| Param | Type |
| --- | --- |
| [popupUri] | <code>string</code> | 

<a name="SolidFileClient+checkSession"></a>

### solidFileClient.checkSession() ⇒ <code>Promise.&lt;(Session\|undefined)&gt;</code>
Return the currently active webId if available

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  
**Returns**: <code>Promise.&lt;(Session\|undefined)&gt;</code> - session if logged in, else undefined  
<a name="SolidFileClient+currentSession"></a>

### solidFileClient.currentSession() ⇒ <code>Promise.&lt;(Session\|undefined)&gt;</code>
Return the currently active session if available

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  
**Returns**: <code>Promise.&lt;(Session\|undefined)&gt;</code> - session if logged in, else undefined  
<a name="SolidFileClient+getCredentials"></a>

### solidFileClient.getCredentials(fn) ⇒ <code>object</code>
Get credentials from the current session

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  

| Param | Type |
| --- | --- |
| fn | <code>any</code> | 

<a name="SolidFileClient+logout"></a>

### solidFileClient.logout() ⇒ <code>Promise.&lt;void&gt;</code>
Logout the user from the pod

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  
<a name="SolidFileClient+readFile"></a>

### solidFileClient.readFile(url, [request]) ⇒ <code>Promise.&lt;(string\|Response\|Blob)&gt;</code>
Fetch an item and return content as text,json,or blob as needed

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [request] | <code>RequestInit</code> | 

<a name="SolidFileClient+fetchAndParse"></a>

### solidFileClient.fetchAndParse(url, [contentType]) ⇒ <code>Promise.&lt;object&gt;</code>
fetchAndParse

backwards incompatible change : dropping support for JSON parsing, this is only for RDF
backwards incompatible change : now reurns an rdf-query/N3 quad-store rather than an rdflib store
backwards incompatible change : parsed quads are returned, not a response object with store in body

Fetch an item and parse it

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [contentType] | <code>string</code> | 

<a name="defaultPopupUri"></a>

## defaultPopupUri
TBD
maybe eventually reintroduce the fetch API response interface
for now throwErrors will be the only option so no need for this line
const defaultInitOptions = { throwErrors:false }

**Kind**: global constant  
<a name="WriteOptions"></a>

## WriteOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [overwriteFiles] | <code>boolean</code> | <code>true</code> | replace existing files |
| [overwriteFolders] | <code>boolean</code> | <code>false</code> | delete existing folders and their contents |
| [createPath] | <code>boolean</code> | <code>true</code> | create parent containers if they don't exist |
| [copyAcl] | <code>boolean</code> | <code>true</code> | Unused yet |
| [copyMeta] | <code>boolean</code> | <code>true</code> | Unused yet |

<a name="SolidApiOptions"></a>

## SolidApiOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [enableLogging] | <code>boolean</code> \| <code>string</code> | <code>false</code> | set to true to output all logging to the console or e.g. solid-file-client:fetch for partial logs |

<a name="Item"></a>

## Item
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| url | <code>string</code> | 
| name | <code>string</code> | 
| parent | <code>string</code> | 
| itemType | <code>&quot;Container&quot;</code> \| <code>&quot;Resource&quot;</code> | 

<a name="FolderData"></a>

## FolderData : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| url | <code>string</code> | 
| name | <code>string</code> | 
| parent | <code>string</code> | 
| type | <code>&quot;folder&quot;</code> | 
| folders | [<code>Array.&lt;Item&gt;</code>](#Item) | 
| files | [<code>Array.&lt;Item&gt;</code>](#Item) | 

<a name="fetch"></a>

## fetch ⇒ <code>Promise.&lt;Response&gt;</code>
(optionally authenticated) fetch method similar to window.fetch

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SessionAuthorization"></a>

## SessionAuthorization : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| client_id | <code>string</code> | 
| access_token | <code>string</code> | 
| id_token | <code>string</code> | 

<a name="Session"></a>

## Session : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| idp | <code>string</code> | 
| webId | <code>string</code> | 
| issuer | <code>string</code> | 
| credentialType | <code>string</code> | 
| sessionKey | <code>string</code> | 
| idClaims | <code>string</code> | 
| authorization | [<code>SessionAuthorization</code>](#SessionAuthorization) | 

<a name="fetch"></a>

## fetch ⇒ <code>Promise.&lt;Response&gt;</code>
(optionally authenticated) fetch method similar to window.fetch

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAuthClient"></a>

## SolidAuthClient : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| fetch | [<code>fetch</code>](#fetch) | 
| login | <code>function</code> | 
| popupLogin | <code>function</code> | 
| currentSession | <code>function</code> | 
| trackSession | <code>function</code> | 
| logout | <code>function</code> | 

<a name="SolidFileClientOptions"></a>

## SolidFileClientOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [enableLogging] | <code>boolean</code> \| <code>string</code> | <code>false</code> | true for all logging or e.g. solid-file-client:fetch for partial logs |

<a name="LoginCredentials"></a>

## LoginCredentials : <code>object</code>
**Kind**: global typedef  
**Todo**

- [ ] Update this declaration

