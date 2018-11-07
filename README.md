# solid-file-client
A library supporting connections and CRUD for Solid files and folders

This library provides a simple interface for logging in and out of a 
Solid data store and for creating, reading, updating, and deleting
files and folders on it. It may be used either directly in the browser or 
with node/require.  Working examples of both kinds of usage can be found in
the included browser-example.html and node-example.js files.  The library
is based on solid-auth-client and simply provides an error-handling 
interface and some convenient shortcuts on top of it.

## Installation
Just download it.

## Invocation
In a node/require context

``` javascript
// rdflib and solid-auth-client must be available
// but will be required automatically by the library

const fileClient = require('solid-file-client')
```
In the browser
```html 
<script src="somepath/rdflib.js"></script>
<script src="somepath/solid-auth-client.js"></script>
<script src="somepath/solid-file-client.js"></script>
<script> const fileClient = new SolidFileClient() </script>
```
## Error reporting

All methods are asynchronous, return false on error, and put the error
in the fileClient.err variable.  For example
   
        fileClient.delete( url ).then( response => {
            if(!response) alert( "Couldn't delete "+url+" "+fileClient.err )
            else alert( url+" successfully deleted" )
        })

## Content-types
Many methods take and/or return content-type parameters. The library can
handle text/* types (e.g. text/turtle, text/html) and text-based application/* types (e.g. application/json). A special content-type "folder" is 
used for ldp:BasicContainer resources.  In cases where the content type is
omitted, the type will be guessed from the file extension or a trailing 
slash to indicate a folder.

## Connection Methods

**login(**IDP**)**<br>
**popupLogin(**IDP,popupUrl**)**

        fileClient.login(idp).then( webId => {
            if(!webId) console.log(fileClient.err)
            else console.log( `Logged in as ${webId}.`)
        })

Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community') on a redirected page (login) or a popup window (popupLogin) and returns to wherever it was called from.  The popupUrl parameter is the location of an html popup login form and if omitted uses the form at https://solid.community/common/popup.html as the default.

**logout()**

        fileClient.logout().then( console.log( `Bye now!` )

**checkSession()**

        fileClient.checkSession().then( session => {
            if(!session) console.log("Not logged in.")
            else console.log("Logged in as "+session.webId)
        })

## File Methods

**createFile(**URL,contentType**)**

        fileClient.createFile( newFile ).then( success => {
            if(!success) console.log(fileClient.err)
            else console.log( `Created file ${newFile}.`)
        })

This method creates a new empty file.
The contentType should be specified either in the URL's extension or in
the contentType parameter, but not both. 

NOTE : if the file already exists, the solid.community server (and others) will create an additional file with a prepended numerical ID so if you don't want that to happen, use updateFile() which will first delete the file if it exists, and then add the new file.

**readFile(**URL**)**

        fileClient.readFile( newFile ).then( response => {
            if(!response) console.log(fileClient.err)
            else console.log( `File content is : ${response.value}.`
        })

In the case of a successful fetch of an empty file, the response
will be true but the response.value will be empty.  This means
that any true response can be interpreted as "this file exists"
and you need to check response.value for its content, if any.

**updateFile(**URL,content**)**

        fileClient.updateFile( url, newContent ).then( success => {
            if(!success) console.log(fileClient.err)
            else console.log( `Updated ${url}.`)
        })

NOTE : this is a file-level update, it replaces the file with the new content by removing the old version of the file and adding the new one.

**deleteFile(**URL**)**

        fileClient.deleteFile( url ).then( success => {
            if(!success) console.log(fileClient.err)
            else console.log( `Deleted ${url}.`)
        })

**fetchAndParse(**URL,contentType**)**

Results will be empty on either a failure to fetch or a failure to parse
and the relevant error will be in fileClient.err. If the content-type is
omitted, it will be guessed from the file extension. If the  content-type
is or is guessed to be 'text/turtle' or any other format that rdflib can 
parse, the response will be parsed by rdflib and returned as an rdflib
graph object.  If the content-type is 'application/json' the response will
be a JSON object.  

        fileClient.fetchAndParse(url,'text/turtle').then( graph => {
            if(!graph) alert("Couldn't fetch or parse : "+fileClient.err)
            else {
                let something = graph.any(someSubject,somePredicate)
            }
        })


## Folder Methods

**createFolder(**URL**)**<br>

        fileClient.createFolder( url ).then( success => {
            if(!success) console.log(fileClient.err)
            else console.log( `Created folder ${url}.`)
        })

**deleteFolder(**URL**)**

        fileClient.deleteFolder( url ).then( success => {
            if(!success) console.log(fileClient.err)
            ese console.log( `Deleted ${url}.`)
        })     

Attempting to delete a non-empty folder will fail with a "409 Conflict"
error.

**readFolder(**URL**)**

        fileClient.readFolder( url ).then( folder => {
            if(!folder) console.log(fileClient.err)
            else console.log( 
                `Read ${folder.name}, it has ${folder.files.length} files.`
            )
        })

On success, the readFolder() method returns a folder object in this format:

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

Each item in the arrays of files and sub-folders will be a file object
which is the same as a folder object except it does not have the
last two fields (files,folders).  The content-type in this
case is not guessed, it is read from the folder's triples, i.e. what the 
server sends.

## A General Fetch Method

**fetch(**URL,request**)**

Results will be empty on failure to fetch and on sucess results.value will
hold the raw text of the resource.  It may be called with a simple URL 
parameter or with a full request object which specifies method, headers, etc.
This is a pass-through to solid-auth-client.fetch providing some error 
trapping to make it consistent with the solid-file-client interface but
otherwise, see the solid-auth-client docs and the Solid REST spec for
details.

        fileClient.fetch( url ).then( results => {
            if(!results) alert("Could not fetch "+url+" "+fileClient.err)
            else // do something with results.value
        })
  
**copyright (c) 2018 Jeff Zucker**
