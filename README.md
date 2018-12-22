# solid-file-client

**A library for creating and managing files and folders in Solid data stores**

This library provides a simple interface for logging in and out of a
Solid data store and for creating, reading, updating, and deleting
files and folders on it. It may be used either directly in the browser or
with node/require. The library is based on solid-auth-client, providing
an error-handling interface and some convenience shortcuts on
top of solid-auth-client's methods.

## Using in the browser

Either download locally as shown below or use CDN like this:

```HTML
       <script src="https://cdn.jsdelivr.net/npm/solid-file-client@0.2.0/dist/umd/solid-file-client.bundle.js"></script>
```

## Downloading locally

       npm install solid-file-client

## Build Options

If you install locally, the node_modules/solid-file-client/ folder contains three builds:

       ./dist       built for use with node
       ./dist/umd   built for use with browser, bundled rdflib & solid-auth-client
       ./dist/esm   built for use with module-import/esm

## Invocation

In the browser

       const fileClient = SolidFileClient;

In a node/require context

       const fileClient = require('solid-file-client');

## Error reporting

All methods are promises. For example
```javascript
fileClient.delete( url ).then( response => {
    alert( url+" successfully deleted" )
}, err => console.log(url+" not deleted : "+err) );
```

## Content-types

Many methods take and/or return content-type parameters. The library can
handle text/_ types (e.g. text/turtle, text/html) and text-based application/_ types (e.g. application/json). A special content-type "folder" is
used for ldp:BasicContainer resources. In cases where the content type is
omitted, the type will be guessed from the file extension or a trailing
slash to indicate a folder.

## Connection Methods

**popupLogin()**

```javascript
fileClient.popupLogin().then( webId => {
    else console.log( `Logged in as ${webId}.`)
}, err => console.log(err) );
```

Opens a popup window that prompts for an IDP then lets you login.

**login(**IDP**)**<br>

```javascript
fileClient.login(idp).then( webId => {
    console.log( `Logged in as ${webId}.`)
}, err => console.log(err) );
```

Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community') on a redirected page and returns to wherever it was called from.

**logout()**

```javascript
fileClient.logout().then( console.log( `Bye now!` )
```

**checkSession()**

```javascript
fileClient.checkSession().then( session => {
    console.log("Logged in as "+session.webId)
}, err => console.log(err) );
```

## File Methods

**createFile(**URL,contentType**)**

```javascript
fileClient.createFile(newFile).then(success => {
  console.log(`Created file ${newFile}.`);
}, err => console.log(err) );

```

This method creates a new empty file.
The contentType should be specified either in the URL's extension or in
the contentType parameter, but not both.

NOTE : if the file already exists, the solid.community server (and others) will create an additional file with a prepended numerical ID so if you don't want that to happen, use updateFile() which will first delete the file if it exists, and then add the new file.

**readFile(**URL**)**

```javascript
fileClient.readFile(newFile).then(  body => {
  console.log(`File content is : ${body}.`);
}, err => console.log(err) );
```

**updateFile(**URL,content,contentType**)**

```javascript
fileClient.updateFile( url, newContent, contentType ).then( success => {
    console.log( `Updated ${url}.`)
}, err => console.log(err) );
```
NOTE : this is a file-level update, it replaces the file with the new content by removing the old version of the file and adding the new one.  The contentType parameter is optional, do not specify it if you include a file extension.

**deleteFile(**URL**)**

```javascript
fileClient.deleteFile(url).then(success => {
  console.log(`Deleted ${url}.`);
}, err => console.log(err) );
```

**fetchAndParse(**URL,contentType**)**

Results will be empty on either a failure to fetch or a failure to parse
and the relevant error will be in fileClient.err. If the content-type is
omitted, it will be guessed from the file extension. If the content-type
is or is guessed to be 'text/turtle' or any other format that rdflib can
parse, the response will be parsed by rdflib and returned as an rdflib
graph object. If the content-type is 'application/json' the response will
be a JSON object.

```javascript
fileClient.fetchAndParse(url, 'text/turtle').then(graph => {
    let something = graph.any(someSubject, somePredicate);
}, err => console.log(err) );
```

## Folder Methods

**createFolder(**URL**)**<br>

```javascript
fileClient.createFolder(url).then(success => {
  console.log(`Created folder ${url}.`);
}, err => console.log(err) );
```

**deleteFolder(**URL**)**

```javascript
fileClient.deleteFolder(url).then(success => {
  console.log(`Deleted ${url}.`);
}, err => console.log(err) );
```

Attempting to delete a non-empty folder will fail with a "409 Conflict"
error.

**readFolder(**URL**)**

```javascript
fileClient.readFolder(url).then(folder => {
  console.log(`Read ${folder.name}, it has ${folder.files.length} files.`);
}, err => console.log(err) );
```

On success, the readFolder() method returns a folder object in this format:

```javascript
{
     type : "folder",
     name : // folder name (without path),
      url : // full URL of the resource,
 modified : // dcterms:modified date
    mtime : // stat:mtime
     size : // stat:size
   parent : // parentFolder or undef if none,
  content : // raw content of the folder's turtle representation,
    files : // an array of files in the folder
  folders : // an array of sub-folders in the folder,
}
```

Each item in the arrays of files and sub-folders will be a file object
which is the same as a folder object except it does not have the
last two fields (files,folders). The content-type in this
case is not guessed, it is read from the folder's triples, i.e. what the
server sends.

## A General Fetch Method

**fetch(**URL,request**)**

Results will be empty on failure to fetch and on sucess results.value will
hold the raw text of the resource. It may be called with a simple URL
parameter or with a full request object which specifies method, headers, etc.
This is a pass-through to solid-auth-client.fetch providing some error
trapping to make it consistent with the solid-file-client interface but
otherwise, see the solid-auth-client docs and the Solid REST spec for
details.

```javascript
fileClient.fetch( url, request ).then( results => {
     // do something with results
}, err => console.log(err) );
```

**copyright (c) 2018 Jeff Zucker** may be freely used with MIT license
