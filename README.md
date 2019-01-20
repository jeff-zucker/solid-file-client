# solid-file-client

**A library for creating and managing files and folders in Solid data stores**
<br>
<a href="http://badge.fury.io/js/solid-file-client">![npm](https://badge.fury.io/js/solid-file-client.svg)</a>

This library provides a simple interface for logging in and out of a
Solid data store, maintaining a persistent session, and for managing
files and folders. It may be used either directly in the browser or
with node/require. The library is based on solid-auth-client and 
solid-cli, providing an error-handling interface and some convenience
shortcuts on top of their methods and providing a common interface to
the two modules.

    solid-cli-----------+                       +--> browser apps
                        +---solid-file-client---+
    solid-auth-client---+                       +--> console apps

## Using in the browser

Either download locally as shown below or use CDN like this:

```HTML
<script src="https://cdn.jsdelivr.net/npm/solid-file-client/dist/browser/solid-file-client.bundle.js"></script>
```

## Downloading locally

       npm install solid-file-client

## Build Options

If you install locally, the node_modules/solid-file-client/ folder contains these builds:

    ./dist/console for use with node
    ./dist/browser for use with browser, bundled rdflib & solid-auth-client

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

## Connection Methods

**popupLogin()** **only in browser context**

Opens a popup window that prompts for an IDP then lets you login.

```javascript
fileClient.popupLogin().then( webId => {
    else console.log( `Logged in as ${webId}.`)
}, err => console.log(err) );
```

**login(**IDP**)** **only in browser context**

Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community') on a redirected page and returns to wherever it was called from. 

```javascript
fileClient.login(idp).then( webId => {
    console.log( `Logged in as ${webId}.`)
}, err => console.log(err) );
```

**login(**credentials**)** **only in node/console context**

Logs in using a credentials object that may be created in a script 
or pulled from a config file.  See getCredentials() below for details

```javascript
fileClient.login(credentials).then( webId => {
    console.log( `Logged in as ${webId}.`)
}, err => console.log(err) );
```

**getCredentials( configFile )** **only in node/console context**

The configFile parameter is optional.  It should point to a JSON file
as described below. If no configFile is specified, the method will
look for the file named ~/.solid-auth-client-config.json.

Wherever it is located, the file must contain a JSON structure like
this:

```javascript
{
    "idp"      : "https://solid.community",
    "username" : "YOUR-USER-NAME",                  
    "password" : "YOUR-PASSWORD",     // OPTIONAL !!!
    "base"     : "https://YOU.solid.community",
    "test"     : "/public/test/"
}
```

The base field should be the root of your POD with the trailing slash
omitted.  The test field should specify a directory under the base that
can be used to write test files. In the example above, the folder at
https://YOU.solid.community/public/test/ would be used for testing.

If you choose not to store passwords in the configuration file, your script
should prompt for a password.


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

**createFile(**URL,content,contentType**)**

```javascript
fileClient.createFile(newFile).then( fileCreated => {
  console.log(`Created file ${fileCreated}.`);
}, err => console.log(err) );

```

This method creates a new empty file.
The contentType should be specified either in the URL's extension or in
the contentType parameter, but not both.

NOTE : if the file already exists, the solid.community server (and others) will create an additional file with a prepended numerical ID so if you don't want that to happen, use updateFile() which will first delete the file if it exists, and then add the new file. If you do want to create the additional file, you can retrieve it's name, including the prepended numerical ID in the return from createFile() as shown above with the "fileCreated" parameter.

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

**copyFile(**old,new**)**

Copies a file from one location on a Solid Server to another location on
the same or a different Solid server.  Use the full URL, including file
name, to both the old and new parameters. 

```javascript
fileClient.copy(old,new).then(success => {
  console.log(`Copied ${old} to ${new}.`);
}, err => console.log(err) );
```

**download(**localPath,URL**)**

Downloads the specified URL. The localPath should be a local folder with a path
relative to the folder the script is running in.

**Note**: only available in console for now.


```javascript
fileClient.downloadFile(localPath,URL).then(success => {
  console.log(`Downloaded ${url} to ${localPath}.`);
}, err => console.log(err) );
```
**upload(**remotePath,file**)**

Uploads the specified local file whose path should be specified relative
to the folder the script is running in.

**Note**: only available in console for now.

```javascript
fileClient.uploadFile(localPath,url).then(success => {
  console.log(`Uploaded ${localPath} to ${url}.`);
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

**copyFolder(**oldFolder,newFolder**)**

Does a deep (recursive) copy from one Solid folder to another, creating
sub-folders as needed or filling them if they already exist.


```javascript
fileClient.copy(old,new).then(success => {
  console.log(`Copied ${old} to ${new}.`);
}, err => console.log(err) );
```


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

## Acknowledgements

Many thanks for patches and issues from https://github.com/linonetwo, 
https://github.com/scenaristeur, https://github.com/bourgeoa.
 

**copyright (c) 2018 Jeff Zucker** may be freely used with MIT license
