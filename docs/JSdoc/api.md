## Classes

<dl>
<dt><a href="#SolidAPI">SolidAPI</a></dt>
<dd></dd>
<dt><a href="#SolidFileClient">SolidFileClient</a> ⇐ <code>SolidApi</code></dt>
<dd><p>Class for working with files on Solid Pods</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#WriteOptions">WriteOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ReadFolderOptions">ReadFolderOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#SolidApiOptions">SolidApiOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Links">Links</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Item">Item</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#FolderData">FolderData</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#fetch">fetch</a> ⇒ <code>Promise.&lt;Response&gt;</code></dt>
<dd><p>(optionally authenticated) fetch method similar to window.fetch</p>
</dd>
<dt><a href="#SolidFileClientOptions">SolidFileClientOptions</a> : <code>object</code></dt>
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
    * [.postItem(url, content, contentType, link, [options])](#SolidAPI+postItem) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.createFolder(url, [options])](#SolidAPI+createFolder) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.postFile(url, content, [options])](#SolidAPI+postFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.createFile(url, content, [options])](#SolidAPI+createFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.putFile(url, content, [options])](#SolidAPI+putFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.readFolder(url, [options])](#SolidAPI+readFolder) ⇒ [<code>Promise.&lt;FolderData&gt;</code>](#FolderData)
    * [.getItemLinks(url, [options])](#SolidAPI+getItemLinks) ⇒ [<code>Promise.&lt;Links&gt;</code>](#Links)
    * [.copyFile(from, to, [options])](#SolidAPI+copyFile) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.copyMetaFileForItem(oldTargetFile, newTargetFile, [options])](#SolidAPI+copyMetaFileForItem) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.copyAclFileForItem(oldTargetFile, newTargetFile, [options])](#SolidAPI+copyAclFileForItem) ⇒ <code>Promise.&lt;Response&gt;</code>
    * [.copyLinksForItem(oldTargetFile, newTargetFile, [options])](#SolidAPI+copyLinksForItem) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.copyFolder(from, to, [options])](#SolidAPI+copyFolder) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.copy(from, to, [options])](#SolidAPI+copy) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.deleteFolderContents(url)](#SolidAPI+deleteFolderContents) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.deleteFolderRecursively(url)](#SolidAPI+deleteFolderRecursively) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.move(from, to, [copyOptions])](#SolidAPI+move) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
    * [.rename(url, newName, [moveOptions])](#SolidAPI+rename) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>

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

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+get"></a>

### solidAPI.get(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send get request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+delete"></a>

### solidAPI.delete(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send delete request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+post"></a>

### solidAPI.post(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send post request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+put"></a>

### solidAPI.put(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send put request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+patch"></a>

### solidAPI.patch(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send patch request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+head"></a>

### solidAPI.head(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send head request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+options"></a>

### solidAPI.options(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Send options request

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | <code>RequestInit</code> | 

<a name="SolidAPI+itemExists"></a>

### solidAPI.itemExists(url) ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if item exists.
Return false if status is 404. If status is 403 (or any other "bad" status) reject.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+postItem"></a>

### solidAPI.postItem(url, content, contentType, link, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create an item at target url.
Per default it will create the parent folder if it doesn't exist.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> |  |
| content | <code>Blob</code> \| <code>string</code> |  |
| contentType | <code>string</code> |  |
| link | <code>string</code> | header for Container/Resource, see LINK in apiUtils |
| [options] | [<code>WriteOptions</code>](#WriteOptions) | only uses createPath option |

<a name="SolidAPI+createFolder"></a>

### solidAPI.createFolder(url, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a folder if it doesn't exist.
Per default it will resolve when the folder already existed

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - Response of HEAD request if it already existed, else of creation request  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+postFile"></a>

### solidAPI.postFile(url, content, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a new file.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| content | <code>Blob</code> \| <code>String</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+createFile"></a>

### solidAPI.createFile(url, content, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Create a new file.
Per default it will overwrite existing files

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

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

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| content | <code>Blob</code> \| <code>String</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+readFolder"></a>

### solidAPI.readFolder(url, [options]) ⇒ [<code>Promise.&lt;FolderData&gt;</code>](#FolderData)
Fetch and parse a folder

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [options] | [<code>ReadFolderOptions</code>](#ReadFolderOptions) | 

<a name="SolidAPI+getItemLinks"></a>

### solidAPI.getItemLinks(url, [options]) ⇒ [<code>Promise.&lt;Links&gt;</code>](#Links)
Get acl and meta links of an item

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> |  |
| [options] | <code>object</code> | specify if links should be checked for existence or not |

<a name="SolidAPI+copyFile"></a>

### solidAPI.copyFile(from, to, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Copy a file.
Per default overwrite existing files and copy links too.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - - Response from the new file created  

| Param | Type | Description |
| --- | --- | --- |
| from | <code>string</code> | Url where the file currently is |
| to | <code>string</code> | Url where it should be copied to |
| [options] | [<code>WriteOptions</code>](#WriteOptions) |  |

<a name="SolidAPI+copyMetaFileForItem"></a>

### solidAPI.copyMetaFileForItem(oldTargetFile, newTargetFile, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Copy a meta file

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - creation response  

| Param | Type |
| --- | --- |
| oldTargetFile | <code>string</code> | 
| newTargetFile | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+copyAclFileForItem"></a>

### solidAPI.copyAclFileForItem(oldTargetFile, newTargetFile, [options]) ⇒ <code>Promise.&lt;Response&gt;</code>
Copy an ACL file

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Response&gt;</code> - creation response  

| Param | Type | Description |
| --- | --- | --- |
| oldTargetFile | <code>string</code> | Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl) |
| newTargetFile | <code>string</code> | Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl) |
| [options] | [<code>WriteOptions</code>](#WriteOptions) |  |

<a name="SolidAPI+copyLinksForItem"></a>

### solidAPI.copyLinksForItem(oldTargetFile, newTargetFile, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Copy links for an item. Use withAcl and withMeta options to specify which links to copy
Does not throw if the links don't exist.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - creation responses  

| Param | Type | Description |
| --- | --- | --- |
| oldTargetFile | <code>string</code> | Url of the file the acl file targets (e.g. file.ttl for file.ttl.acl) |
| newTargetFile | <code>string</code> | Url of the new file targeted (e.g. new-file.ttl for new-file.ttl.acl) |
| [options] | [<code>WriteOptions</code>](#WriteOptions) |  |

<a name="SolidAPI+copyFolder"></a>

### solidAPI.copyFolder(from, to, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Copy a folder and all contents.
Per default existing folders will be deleted before copying and links will be copied.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of creation responses.
The first one will be the folder specified by "to".
The others will be creation responses from the contents in arbitrary order.  

| Param | Type |
| --- | --- |
| from | <code>string</code> | 
| to | <code>string</code> | 
| [options] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+copy"></a>

### solidAPI.copy(from, to, [options]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Copy a file (url ending with file name) or folder (url ending with "/").
Per default existing folders will be deleted before copying and links will be copied.

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of creation responses.
The first one will be the folder specified by "to".
If it is a folder, the others will be creation responses from the contents in arbitrary order.  

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

| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+deleteFolderRecursively"></a>

### solidAPI.deleteFolderRecursively(url) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Delete a folder, its contents and links recursively

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Resolves with an array of deletion responses.
The first one will be the folder specified by "url".
The others will be the deletion responses from the contents in arbitrary order  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 

<a name="SolidAPI+move"></a>

### solidAPI.move(from, to, [copyOptions]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Move a file (url ending with file name) or folder (url ending with "/").
Shortcut for copying and deleting items

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Responses of the copying  

| Param | Type |
| --- | --- |
| from | <code>string</code> | 
| to | <code>string</code> | 
| [copyOptions] | [<code>WriteOptions</code>](#WriteOptions) | 

<a name="SolidAPI+rename"></a>

### solidAPI.rename(url, newName, [moveOptions]) ⇒ <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code>
Rename a file (url ending with file name) or folder (url ending with "/").
Shortcut for moving items within the same directory

**Kind**: instance method of [<code>SolidAPI</code>](#SolidAPI)  
**Returns**: <code>Promise.&lt;Array.&lt;Response&gt;&gt;</code> - Response of the newly created items  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| newName | <code>string</code> | 
| [moveOptions] | <code>RequestOptions</code> | 

<a name="SolidFileClient"></a>

## SolidFileClient ⇐ <code>SolidApi</code>
Class for working with files on Solid Pods

**Kind**: global class  
**Extends**: <code>SolidApi</code>  

* [SolidFileClient](#SolidFileClient) ⇐ <code>SolidApi</code>
    * [new SolidFileClient(auth, [options])](#new_SolidFileClient_new)
    * [.readFile(url, [request])](#SolidFileClient+readFile) ⇒ <code>Promise.&lt;(string\|Blob\|Response)&gt;</code>

<a name="new_SolidFileClient_new"></a>

### new SolidFileClient(auth, [options])

| Param | Type | Description |
| --- | --- | --- |
| auth | <code>SolidAuthClient</code> | An auth client, for instance solid-auth-client or solid-auth-cli |
| [options] | [<code>SolidFileClientOptions</code>](#SolidFileClientOptions) |  |

<a name="SolidFileClient+readFile"></a>

### solidFileClient.readFile(url, [request]) ⇒ <code>Promise.&lt;(string\|Blob\|Response)&gt;</code>
Fetch an item and return content as text,json,or blob as needed

**Kind**: instance method of [<code>SolidFileClient</code>](#SolidFileClient)  

| Param | Type |
| --- | --- |
| url | <code>string</code> | 
| [request] | <code>RequestInit</code> | 

<a name="WriteOptions"></a>

## WriteOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [createPath] | <code>boolean</code> | <code>true</code> | create parent containers if they don't exist |
| [withAcl] | <code>boolean</code> | <code>true</code> | also copy acl files |
| [withMeta] | <code>boolean</code> | <code>true</code> | also copy meta files |
| [merge] | <code>MERGE</code> | <code>&quot;replace&quot;</code> | specify how to handle existing files/folders |

<a name="ReadFolderOptions"></a>

## ReadFolderOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default |
| --- | --- | --- |
| [links] | <code>LINKS</code> | <code>&quot;exclude&quot;</code> | 

<a name="SolidApiOptions"></a>

## SolidApiOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [enableLogging] | <code>boolean</code> \| <code>string</code> | <code>false</code> | set to true to output all logging to the console or e.g. solid-file-client:fetch for partial logs |

<a name="Links"></a>

## Links : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| [acl] | <code>string</code> | 
| [meta] | <code>string</code> | 

<a name="Item"></a>

## Item : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| url | <code>string</code> | 
| name | <code>string</code> | 
| parent | <code>string</code> | 
| itemType | <code>&quot;Container&quot;</code> \| <code>&quot;Resource&quot;</code> | 
| [links] | [<code>Links</code>](#Links) | 

<a name="FolderData"></a>

## FolderData : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| url | <code>string</code> | 
| name | <code>string</code> | 
| parent | <code>string</code> | 
| links | [<code>Links</code>](#Links) | 
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

<a name="SolidFileClientOptions"></a>

## SolidFileClientOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| [enableLogging] | <code>boolean</code> \| <code>string</code> | <code>false</code> | true for all logging or e.g. solid-file-client:fetch for partial logs |

