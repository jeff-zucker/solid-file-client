# solid-file-client

**A library for creating and managing files and folders in Solid data stores**

This library provides a simple interface for logging in and out of a
Solid data store and for creating, reading, updating, and deleting
files and folders on it. It may be used either directly in the browser or
with node/require. The library is based on solid-auth-client, providing
an error-handling interface and some convenience shortcuts on
top of solid-auth-client's methods.

## Installation

Just download it.

## Invocation

In a node/require context

```javascript
// rdflib and solid-auth-client must be available
// but will be required automatically by the library

const fileClient = require('solid-file-client');
```

In the browser

```html
<script src="somepath/rdflib.js"></script>
<script src="somepath/solid-auth-client.js"></script>
<script src="somepath/solid-file-client.js"></script>
<script>
  const fileClient = new SolidFileClient();
</script>
```

## Error reporting

<<<<<<< HEAD
All methods are promises. For example
```javascript
fileClient.delete( url ).then( response => {
    alert( url+" successfully deleted" )
}, err => console.log(url+" not deleted : "+err) );
=======
All methods are asynchronous, return false on error, and put the error
in the fileClient.err variable. For example

```javascript
fileClient.delete(url).then(response => {
  if (!response) alert("Couldn't delete " + url + ' ' + fileClient.err);
  else alert(url + ' successfully deleted');
});
>>>>>>> a77cbd4364c96c8829784d83ff33036b9981055e
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
<<<<<<< HEAD
fileClient.popupLogin().then( webId => {
    else console.log( `Logged in as ${webId}.`)
}, err => console.log(err);
=======
fileClient.popupLogin().then(webId => {
  if (!webId) console.log(fileClient.err);
  else console.log(`Logged in as ${webId}.`);
});
>>>>>>> a77cbd4364c96c8829784d83ff33036b9981055e
```

Opens a popup window that prompts for an IDP then lets you login.

**login(**IDP**)**<br>

```javascript
<<<<<<< HEAD
fileClient.login(idp).then( webId => {
    console.log( `Logged in as ${webId}.`)
}, err => console.log(err);
=======
fileClient.login(idp).then(webId => {
  if (!webId) console.log(fileClient.err);
  else console.log(`Logged in as ${webId}.`);
});
>>>>>>> a77cbd4364c96c8829784d83ff33036b9981055e
```

Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community') on a redirected page and returns to wherever it was called from.

**logout()**

```javascript
fileClient.logout().then( console.log( `Bye now!` )
```

**checkSession()**

```javascript
<<<<<<< HEAD
fileClient.checkSession().then( session => {
    console.log("Logged in as "+session.webId)
}, err => console.log(err);
=======
fileClient.checkSession().then(session => {
  if (!session) console.log('Not logged in.');
  else console.log('Logged in as ' + session.webId);
});
>>>>>>> a77cbd4364c96c8829784d83ff33036b9981055e
```

## File Methods

**createFile(**URL,contentType**)**

```javascript
fileClient.createFile(newFile).then(success => {
  if (!success) console.log(fileClient.err);
  else console.log(`Created file ${newFile}.`);
});
```

This method creates a new empty file.
The contentType should be specified either in the URL's extension or in
the contentType parameter, but not both.

NOTE : if the file already exists, the solid.community server (and others) will create an additional file with a prepended numerical ID so if you don't want that to happen, use updateFile() which will first delete the file if it exists, and then add the new file.

**readFile(**URL**)**

```javascript
fileClient.readFile(newFile).then(response => {
  if (!response) console.log(fileClient.err);
  else console.log(`File content is : ${response.value}.`);
});
```

In the case of a successful fetch of an empty file, the response
will be true but the response.value will be empty. This means
that any true response can be interpreted as "this file exists"
and you need to check response.value for its content, if any.

**updateFile(**URL,content**)**

```javascript
fileClient.updateFile( url, newContent, contentType ).then( success => {
    if(!success) console.log(fileClient.err)
    else console.log( `Updated ${url}.`)
})
```
NOTE : this is a file-level update, it replaces the file with the new content by removing the old version of the file and adding the new one.  The contentType parameter is optional, do not specify it if you include a file extension.

**deleteFile(**URL**)**

```javascript
fileClient.deleteFile(url).then(success => {
  if (!success) console.log(fileClient.err);
  else console.log(`Deleted ${url}.`);
});
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
  if (!graph) alert("Couldn't fetch or parse : " + fileClient.err);
  else {
    let something = graph.any(someSubject, somePredicate);
  }
});
```

## Folder Methods

**createFolder(**URL**)**<br>

```javascript
fileClient.createFolder(url).then(success => {
  if (!success) console.log(fileClient.err);
  else console.log(`Created folder ${url}.`);
});
```

**deleteFolder(**URL**)**

```javascript
fileClient.deleteFolder(url).then(success => {
  if (!success) console.log(fileClient.err);
  else console.log(`Deleted ${url}.`);
});
```

Attempting to delete a non-empty folder will fail with a "409 Conflict"
error.

**readFolder(**URL**)**

```javascript
fileClient.readFolder(url).then(folder => {
  if (!folder) console.log(fileClient.err);
  else console.log(`Read ${folder.name}, it has ${folder.files.length} files.`);
});
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
fileClient.fetch( url ).then( results => {
    if(!results) alert("Could not fetch "+url+" "+fileClient.err)
     else // do something with results.value
 })
```

**copyright (c) 2018 Jeff Zucker**
