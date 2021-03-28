# Solid-File-Client

A library for managing Solid files and folders.

current version : <a href="http://badge.fury.io/js/solid-file-client">![npm](https://img.shields.io/npm/v/solid-file-client)</a>
<br>
previous version : <a href="https://www.npmjs.com/package/solid-file-client/v/0.5.3"><img src="https://img.shields.io/badge/npm%20package-0.5.3-brightgreen.svg"></a>

<b>Table of Contents</b> : <a href="#introduction">Introduction</a> |
<a href="#installing">Installing</a> |
<a href="#importing">Importing, Invoking, Logging In</a> |
<a href="#error-handling">Error Handling</a> |
<a href="#high-level-methods">High Level Methods</a> |
<a href="#advanced-options">Advanced Options</a> |
<a href="#low-level-methods">Low-level Methods</a> |
<a href="#ACL management">ACL management</a> |
<a href="#Solid RDF utilities">Solid RDF utilities</a> |
<a href="#terminology">Note on Terminology</a> |
<a href="#acknowledgements">Acknowledgements</a>

## Introduction

Solid-File-Client is a JavaScript library with high-level methods to create, read, and manage files and folders.  The methods may be used in browser scripts or in nodejs shell scripts.  The library supports both text and binary files and can read and write data from Solid Pods, from local file systems, and from virtual in-memory storage.  It can also recursively move and copy entire folder trees between any of those storage locations. For advanced users, there are also a number of options and lower-level methods which allow fine-tuned control over linked resources and other features of Solid. 

### Note for users of version 0.x of Solid-File-Client

There are a number of changes which are not backward compatible.  See [Guide for transitioning to v.1](docs/transition-to-v.1.md) for details and hints for upgrading.

### Using alternate storage spaces

Solid-file-client can work with web resources (https://).  It can also work
with resources stored in a browser's local storage (app://), or a local file system (file://).  See the [Upload Demo](https://jeff-zucker.github.io/solid-file-client/docs/examples/) for an example of copying files from a local filesystem to a pod in the browser and [Node Upload Demo](docs/node-upload.md) for the same thing in node.  See [Solid-Rest](https://github.com/jeff-zucker/solid-rest) for a description of using browser local storage or accessing the local file system from node scripts.

In node, the copyFile() and copyFolder() commands can upload files from a local file system to a remote pod and vice-versa:

To upload
```javascript
   await fc.copyFolder( "file:///somepath/foo/", "https://somehost/somepath/foo/" )
```
To download
```javascript
   await fc.copyFolder( "https://somehost/somepath/foo/", "file:///somepath/foo/", 
```

### Using with front-ends

Several front-ends for Solid-File-Client have been built.  In a browser you can use the [Solid-IDE](https://github.com/jeff-zucker/solid-ide) GUI or create your own GUI using [Solid-File-Widget](https://github.com/bourgeoa/solid-file-widget) or any GUI framework such as React or Vue.  In node or from the command line, you can use [Solid-Shell](https://github.com/jeff-zucker/solid-shell), an interactive shell, batch-processor, and command-line front-end for Solid-File-Client. 

### Overview of writing methods

By default, all high-level methods that create, copy, or move files or folders have these behaviors :

  * the source always completely overwrites the target
  * if the path to the item doesn't pre-exist, it will be created
  * linked files (.acl and .meta) are copied/moved along with their resources

For many purposes, these defaults will suffice.  However, if you need to, you may change any of them with option flags.  There are several options for merging folder trees as well as for using Solid's POST features. See the sections on [Overwriting](#overwriting), on [Creating Paths](#creating-paths), and on [Linked Files](#linked-files) for more information.

### Demo scripts

See the [Upload & Copy Demos](https://jeff-zucker.github.io/solid-file-client/docs/examples/) for working examples.

## <a name="Installing">Installing</a>

If you are writing scripts only for the browser, you may wish to use a CDN code repository rather than using a local version. See [here](docs/using-in-browser.md) for an example of using a CDN.

If you are writing scripts for node or you want a local version, install using 
npm
```
    npm install solid-file-client
    change to the solid-file-client folder
    npm install   // this pulls in dependencies
    npm run build // this creates the executables
```
Once installed the executables will be found within the solid-file-client folder :
```
    dist/node/solid-file-client.bundle.js      // for node scripts
    dist/window/solid-file-client.bundle.js   // for browser scripts
```
You can also clone or fork the github repository if wish.

## <a name="importing">Importing, invoking, and logging-in</a>

Here is the general process for a script using Solid-File-Client :

* Import the solid-file-client and solid-auth-cli(ent) libraries
* Instantiate an auth object
* Instantiate a file-client object using the auth object
* Use the auth object to login and for session management
* Use the file-client object to read and write files and folders

Here is a short node script illustrating the process.
```javascript
    const auth = require('solid-auth-cli')
    const FC   = require('solid-file-client')
    const fc   = new FC( auth )
    async function run(){
        let session = await auth.currentSession()
        if (!session) { session = await auth.login() }
        console.log(`Logged in as ${session.webId}.`)
        if( await fc.itemExists( someUrl ) {
            let content = await fc.readFile( someUrl )
            // ... other file methods
            // ... and/or other auth methods
        }
    }
    run()
```
See [Using with Node](docs/using-with-node.md) for details of logging
in with node and command line scripts.  See [Using in a Browser](docs/using-in-browser.md) for a detailed example of importing, invoking, and logging in from a browser script.

For more information on auth and session functions see [solid-auth-client](https://github.com/solid/solid-auth-client) for the browser and [solid-auth-cli](https://github.com/jeff-zucker/solid-auth-cli) for node.

## <a name="error-handling">Error Handling</a>

All Solid-File-Client methods should throw an error if they do not succeed.
To trap and examine errors, use try/catch:
```javascript
    fc.readFile(url).then((content) => {
        console.log(content)
    })
    .catch(err => console.error(`Error: ${err}`))
```
Or, in an async method :
```javascript
    try {
        let content = await fc.readFile( someUrl )
        console.log(content)
    }
    catch(error) {
        console.log( error )         // A full error response 
        console.log( error.status )  // Just the status code of the error
        console.log( error.message ) // Just the status code and statusText
    }
```
See [Interpreting Error Responses](docs/error-handling.md) for further options and a
description of errors for recursive methods like copyFolder().

## <a name="high-level-methods">High-level Methods</a>

### createFile( fileURL, content, contentType, options )
### postFile( fileURL, content, contentType, options )

Creates a new file at the specified URL.  Content is required, even if only a blank string.  ContentType should be something like "text/turtle" or "image/png" and is required. 

Default behavior :
  * If a file already exists at that URL, it will be overwritten.
  * If the file's parent path does not exist, it will be created.

See [Overwriting](#overwriting) and [Creating Paths](#creating-paths) if you need to change the default behavior.

Note for all: Previous versions of of Solid Server tried to guess the content-type from the file extension but you should not depend on this behavior.  Previous versions would sometimes add an extension e.g. if you created a file named "foo" with type "text/turtle", it would be renamed "foo.ttl".  This is no longer the case, the file will be named "foo" and will still have the type "text/turtle".

Note for advanced users : This method uses PUT, if you prefer the behavior of 
POST (for example creating alternate versions of a resource rather than replacing it) use the **postFile()** method, which takes the same parameters as createFile().

### patchFile( fileUrl, patchContent, patchContentType )

Modifies the content of fileUrl adding or removing triples.

`fileUrl` is parsed with N3.js ('text/turtle' files and others)

patchContentType is either 'text/n3' or 'application/sparl-update'

- 'text/n3' patchContent can use `inserts`, `deletes` and `where`. N3 notation is a turtle content with graph objects.
```
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix : <#>.
    @prefix ex: <http://example.com#>.
    <> solid:patches <fileUrl>;
          solid:deletes { <> a :test. };
          solid:inserts { <#new> ex:temp :321; ex:temp1 :200, :300. }.
```
if triples `<#new> ex:temp1 :250 exists`. The `solid:inserts` clause can be expressed as :
```
          solid:where { ?a ex:temp1 :250. };
          solid:inserts { ?a ex:temp :321; ex:temp1 :200, :300. }.
```
- 'application/sparql-update' patchContent can only use sparql `INSERT` and `DELETE`. Turtle notation is used for prefix and triples.
```
    @prefix ex: <http://example.com#>.
    INSERT { <#new> ex:temp :321; ex:temp1 :200, :300 .}
    DELETE { <> a :test. }
```
**Nota** on needed acl auth to patch `fileUrl` : 

. with insert `Append` or `Write`,

. and with delete `Write`.

### <a name="createFolder">createFolder( folderURL, options )</a>

Creates a new folder at the specified URL.  

Default behavior :
  * If a folder already exists at that URL, it will be overwritten and all of its contents lost.
  * If the folder's parent path does not exist, it will be created.

See [Overwriting](#overwriting) and [Creating Paths](#creating-paths) to change the default behavior.


### readFile( fileURL, options )

On success, the readFile() method returns the contents of the specified file.
The return value will be a string for text files and a blob for binary files
such as images and music.  

Advanced users : If you want the content as a ReadableStream, or you need to specify an accept header, use the get() or fetch() methods - see [Low-level Methods](#low-level-methods).

### readFolder( folderURL, options )

On success, the readFolder() method returns a folder object in this format:
```javascript
{
     type : "folder",
     name : // folder name (without path),
      url : // full URL of the resource,
 modified : // dcterms:modified date
    mtime : // stat:mtime
     size : // stat:size
   parent : // parentFolder or undef if none
    files : // an array of files in the folder
  folders : // an array of sub-folders in the folder
    links : // an array of links for the folder itself IF links=include specified
}
```
Each item in the arrays of files and sub-folders will be a file object which is the same as a folder object except it does not have the last two fields (files,folders). The content-type in this case is not guessed, it is read from the folder's triples, i.e. what the server sends.

By default, readFolder() does not list linked resources (.acl and .meta files).  To change this behavior, see [Linked files](#linked-files).

### readHead( folderOrFileURL, options ), head( folderOrFileURL, options )

The readHead() method returns all the headers for an item as a string. It is the equivalent of curl -I.
```javascript
    console.log( await fc.readHead(url) ) // prints all headers
``` 
The head() method returns a standard header response which you may inspect useing the headers.get() method.
```javascript
    let response = await fc.head( url )
    let contentType = response.headers.get('content-type')
``` 

### <a name="itemExists">itemExists( fileOrFolderURL )</a>

Returns true if the URL exists and false otherwise.

### deleteFile( fileURL, options )

Deletes the specified file and all linked filed (.acl,.meta)

### deleteFolder( folderURL )

Recursively deletes a folder and all of its contents including all linked files (.acl, .meta).

### moveFile( sourceURL, targetURL, options ), copyFile( sourceURL, targetURL, options )

Copies or moves the specified source to the target.

Defaults :
  * If a file already exists at that target, it will be overwritten.
  * If the target URL's parent path does not exist, it will be created.
  * Linked files (.acl and .meta) will be copied if they exist.

See [Advanced Options](#advanced-options) to modify these default behaviors.

### moveFolder(sourceURL,targetURL,options), copyFolder(sourceURL,targetURL,options)

Recursively copies or moves a folder and all of its contents.

Defaults :
  * If the target exists, it is replaced by the source.
  * If the top target folder's parent path does not exist, it will be created.
  * Linked files (.acl and .meta) will be copied/moved if they exist.

These default behaviors may all be modified.  For example, you can choose from several ways to merge the source and target folders.  See [Advanced Options](#advanced-options) for more details.


### createZipArchive(sourceURL, archiveURL, options), extractZipArchive(archiveURL, targetFolderURL, options)

Zip folder/file and Unzip file.

Defaults :

  * zip/unzip : Linked files (.acl and .meta) will be ziped/unziped if they exist.
  * unzip

        * TargetFolderURL is where the archive file is unzipped
        * if unzipped root file or root folder exist they shall be overwritten
        * .acl are checked for validity (notably for acl:Control by at least one agent type (agent, agentClass, agentGroup))

These default behaviors may all be modified.  For example, you can choose from several ways to unzip the archiveURL, or check for .acl validity.  See [Advanced Options](#advanced-options) for more details.

## <a name="advanced-options">Advanced Options</a>

### <a name="overwriting">Overwriting</a>

By default, methods which create, copy, or move files or folders will overwrite an item of the same name in the target space, replacing it with the source item.  This behavior may be modified in several ways

With any of the create/copy/move methods, you can use the [itemExists()](#itemExists) method to prevent overwriting items.
```javascript
    if( !(await fc.itemExists(x)) ) {
        await fc.createFolder(x) // only create if it doesn't already exist
    }
 ```
With the **copyFolder()** and **moveFolder()** methods, you can elect to merge the source and target with preference for the source or preference for the target:
 
   * **default** - target is replaced by source
   * **merge=keep_source** - target becomes source plus items found only in target 
   * **merge=keep_target** - target becomes target plus items found only in source

For example :
```javascript
    await copyFolder( source, target, {merge:"keep_source"} )
```
To avoid typos, you may also import the constants for these options:
```javascript
    const { MERGE } = SolidFileClient
    await copyFolder( source, target, {merge: MERGE.KEEP_SOURCE } )
```
### <a name="creating-paths">Creating Paths</a>

When you create a file or folder and the path to that item doesn't already exist, Solid-File-Client will create the path for you if it can.  For example, if you ask to create /foo/bar/baz.txt but there is no /foo/ folder and there is no /bar/ folder, Solid-File-Client will create /foo/ and then create /bar/ inside it and then create baz.txt inside that.

If you would rather the program fails if the path you asked for doesn't exist, you may set the "createPath" flag to false.

  * **createFile(),createFolder(),copyFile(),copyFolder(),moveFile(),moveFolder()**
  
      * **default** - create intermediary paths if they are missing
      * **createPath=false** - fail if intermediary paths are missing
      
  * **note** for copyFolder() and moveFolder(), the createPath option applies only to the top-level target folder, not to folders within the target which are handled by the merge option      

For example:
```javascript
      await createFile( url, {createPath:false} )
```

### <a name="linked-files">Linked Files</a>

One of Solid's unique features is the use of linked files.  Currently the two
main types of linked files are .acl files which control access to the main
file they are linked from and .meta files which describe additional features
of the file they are linked from.  Solid-file-client, by default treats these
linked files as tightly bound to the resource they are referencing.  In other
words when you delete, move, or copy a file that has linked files, the linked
files will also be deleted, moved, or copied.  These defaults should be
sufficient for most basic usage.  

Advanced users can modify how linked files are handled with the withAcl, withMeta, agent, and links option flags shown below.

  * **copyFile(),copyFolder(),moveFile(),moveFolder()**

      * **default**        - .acl and .meta items are copied/moved, acl is modified
      * **withAcl=false**   - .acl items are not copied/moved
      * **withMeta=false**  - .meta items are not copied/moved

Solid servers provide the possible location of linked resources in the headers of all resources.  Solid-file-client supports the links=include_possible option to include these possible locations without checking to see if the linked file actually exists. The possible locations tell you where to create the linked file if they don't already exist.

  *  **readFolder()**

      * **default**                - linked items are not listed
      * **links=include**          - linked items are listed, when they exist
      * **links=include_possible** - possible locations of links are listed

For example:
```javascript
      await copyFile( source, target, {links:"exclude"} )
      await readFolder( url, {links:"include_possible"} )
```
To avoid typos, you may also import the constants for the link options:
```javascript
    const { LINKS } = SolidFileClient
    await copyFolder( source, target, {links: LINKS.INCLUDE_POSSIBLE} )
```
With readFolder()'s links:include and links:include_possible option flags, the links for the folder are a property of the folder object and the links for contained resources are in the file objects.  For example:
```javascript
      let folder = await readFolder( url, {links:"include"} )
      console.log(folder.links.meta || "no .meta for this folder")
      console.log(folder.files[0].links.acl) || "no .acl for this file")
```
See also, the **getItemLinks()** method which finds the possible locations of linked resources for an item.  See [Low-level Methods](#low-level-methods)

Solid-file-client makes a special case for access control (.acl) files.  These
files may contain absolute links which will no longer work when the file is 
copied or moved.  **You should avoid using absolute links in .acl files.**  If you do use absolute links in your accessTo field, Solid-File-Client will always modify the .acl file to make the accessTo field relative to the new location.  If you use absolute links for the agent field, that could change the owner of the copied or moved resource.  You may control this aspect of modifying the .acl file through the agent flag as shown below.

  * **copyFile(),copyFolder(),moveFile(),moveFolder()**

      * **default**        - accessTo is made relative, agent, untouched
      * **agent=to_source**   - accessTo is made relative, agent made absolute to source
      * **agent=to_target**   - accessTo is made relative, agent made relative to target

## <a name="low-level-methods">Low-level methods</a>

Solid-File-Client provides a number of low-level methods which either support advanced options or directly reflect the behavior of the Solid server without additional processes as are found in the high-level methods.  

See the [JSdoc for the API](docs/JSdoc/api.md) for more details of these methods.

## <a name="ACL management">ACL management</a>

ACL management functions have been implemented to support creation of ACL files. (with createFile() or putFile())
It allows to create/edit programmatically the ACL content using an intermediate ACL object : 

```javascript
-let aclObject = await fc.aclUrlParser(url) // returns an acl object from the acl inheritance algorithm for the url.
- let aclObject = await fc.acl.contentParser(url, aclContent) // returns an aclObject from an acl file Content
- let aclContent = await fc.acl.createContent(url, aclObject, options) /// build acl content from an aclObject for url
- let aclObject = await fc.acl.addUserMode(aclObject, userAgent, userMode, userAccess) // add user, mode and access to an aclObject
- let aclObject = await fc.acl.deleteUserMode(aclobject, userAgent, userMode, userAccess) // delete user,mode and/or access from an aclObject
```

example 1 :
```javascript
// create aclContent with the inheritance algorithm (url is not the link url)
let content = await fc.aclUrlParser(url)
  .then(agents => fc.acl.createContent(url, agents))
```
example 2 :
```javascript
// create a block rule
let aclUsers = await fc.acl.addUserMode({}, [{ agentClass: 'Agent' }], ['Read'])
// add an other rule in the block rule
aclUsers = await fc.acl.addUserMode(aclUsers, [{ agent: 'https://example.solid.community/profile/card#me' }], ['Read', 'Write', 'Control'], ['accessTo'])

// build the aclContent
const aclBloks = [aclUsers] // array of block rules
const aclContent = await fc.acl.createContent('https://example.solid.community/public/text.txt', aclBloks)
console.log('build an aclContent ' + aclContent)


@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix target: <text.txt>.

:Read
    a n0:Authorization;
    n0:accessTo target:;
    n0:agentClass n1:Agent;
    n0:mode n0:Read.

:ReadWriteControl
    a n0:Authorization;
    n0:accessTo target:;
    n0:agent </profile/card#me>;
    n0:mode n0:Read, n0:Write, n0:Control.

```
to create an acl resource for a resource url :
```javascript
    const { acl: aclUrl } = await fc.getItemLinks(url, { links: 'include_possible'})
    return await fc.putFile(aclUrl, aclContent, 'text/turtle')

```
**Nota** :

const aclModes = ['Read', 'Append', 'Write', 'Control']

const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin']

const aclAccess = ['accessTo', 'default']

- userAgent : an array of objects (predicate: object). example: [{ agent: 'https://example.com/profile/card#me'}, { agentClass: 'Agent' }, { origin: 'https://solid.community' }, { default: '' }]
- userMode : an array of acl modes. example: ['Read', 'Write']. To be applied to each element of userAgent
- userAccess : an array of acl access. example : ['accessTo', 'default']
   
   Default is only used in the container acl. Only needed if a subset of rules are inherited.

**Remark** :  among other functions, are available
- an ACL check function : await acl.isValidAcl (itemUrl, aclContent, options)
- and an ACL make relative : acl.makeContentRelative (aclcontent, itemUrl, toName, options)

See the [JSdoc for the aclParser](docs/JSdoc/aclParser.md) for more details on these methods.

## <a name="Solid RDF utilities">Solid RDF utilities</a>

A minimal class to query, edit and write rdf files content in/from N3 store using solid-namespace.

`query(url, s, p, o, g)`
   * loads a Turtle file, parses it, returns an array of quads
   * expects URL of a source file, if empty, uses previously loaded file
   * expects Turtle strings or null for subject, predicate, object, & optional graph
   * supports this non-standard syntax for Turtle strings -
     - {somePrefix:someTerm}
       somePrefix is then replaced using URLs from solid-namespace
       the special prefix thisDoc {thisDoc:me} uses current doc as namespace
     - N3 quad subject, predicate, object and optional graph


Examples :

 write store relative to baseIRI : `const content = fc.$rdf.write(url, { baseIRI: url })`

 get quads from ttlContent : `const quads = fc.$rdf.queryTurtle(url, ttlContent, null, { acl: 'mode'}, { acl: 'Control' })`


See the [JSdoc for the rdf-query](docs/JSdoc/rdf-query.md) for more details on these methods.

## <a name="terminology">Note on terminology</a>

Solid servers can store data directly in a physical file system,  or use a database or other storage.  Instead of talking about "Files" and "Folders", it is more correct to talk about "Containers" and "Resources" - logical terms independent of the storage mechanism.  In this documentation, for simplicity, we've used the file/folder terminology with no implication that it represents a physical file system.


## <a name="acknowledgements">Acknowledgements</a>


This library was originally authored by **<a href="https://github.com/jeff-zucker">Jeff Zucker</a>**. Version 1.0.0 includes many additions and improvements that were the results of a collaboration between Jeff, **<a href="https://github.com/bourgeoa">Alain Bourgeois</a>**, and **<a href="https://github.com/Otto-AA">Otto AA</a>**.

Many thanks for patches and issues from https://github.com/linonetwo, and https://github.com/scenaristeur.

copyright (c) 2018 Jeff Zucker may be freely used with MIT license

