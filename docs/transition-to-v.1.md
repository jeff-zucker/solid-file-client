<a href="../README.md">back to README</a>

# Transitioning from older versions of Solid-File-Client to version 1.x

Version 1.x of Solid-File-Client introduces several changes which are not backward compatible.
If needed while transitioning, you may continue to use an older version of Solid-File-Client although it will not
have the new features and will not be maintained. You can find below a list of the changes.

To use the older version in node, you can npm install solid-file-client@0.5.2.
In the browser, use CDN like this :
```html
    <script src="https://cdn.jsdelivr.net/npm/solid-file-client@0.5.2/dist/window/solid-file-client.bundle.js"></script>
```

## Importing and Requireing libraries

### In the browser

Previously rdflib and solid-auth-client were included in the solid-file-client bundle.  Neither is included now.  Now, you no longer need rdflib, but you do need to manually import solid-auth-client and solid-file-client for example, in script tags using CDN :
```html
    <script src="https://cdn.jsdelivr.net/npm/solid-auth-client@2.3.0/dist-lib/solid-auth-client.bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/solid-file-client@1.0.0/dist/window/solid-file-client.bundle.js"></script>
```

### In node

Previously you needed to require both rdflib and solid-auth-cli. Now, you no longer need rdflib.
```javascript
   const SolidFileCLient = require("solid-file-client")
```

## Creating Authorization and Solid-File-Client objects

Previously the authorization package (solid-auth-client or solid-auth-cli) was automatically 
included in the Solid-File-Client object. This allowed you to use a single object to login, check the session, and perform
file operations.  Now you will need to explicitly create an authorization object, pass it to Solid-File-Client when you create the Solid-File-Client object, .and explicity use the auth object for login and session methods.  The login and session methods (e.g. popuLogin(), checkSession(), etc.) will all work the same way, but instead of calling them with a file client object ( e.g. fc.checkSession() ), you will call them with the authorization object ( e.g. auth.checkSesssion() ).

Here is how to instantiate and use the two objects.

```javascript

    async function run(){

        /* create authorizing and file-client objects
        */
        const auth = solid.auth    // or in node : const auth =  require('solid-auth-cli')
        const fc   = new SolidFileClient(auth)

        /* login and check the session with the auth object
        */
        let session = await auth.currentSession()
        if (!session) { session = await auth.login() }
        console.log(`Logged in as ${session.webId}.`)

        /* use the solid-file-client object
        */
        let content = readFile( someUrl )
        ...
        
    }
```
## Changes in Methods

### createFile()

Previously you needed to use either a file extension or a content-type but not both.  Now you may use both. Don't count on the server guessing the content-type from the extension - this will be deprecated eventually.  Previously a file named "foo" with content-type "text/turtle" would be renamed "foo.ttl".  This renaming now longer occurs.

### upload()

This method is no longer supported. The copyFile() and copyFolder() methods accomplish the same thing.

### updateFile() 

This method is no longer supported.  To replace an existing file, use createFile().

### fetchAndParse() 

This method is no longer supported.  To parse RDF content, use rdflib or another RDF parsing library.

### guessFileType()

This method is no longer supported. You can use mime-types in node or window.Mimer in a browser.
For example :
```html
   <script src="https://cdn.jsdelivr.net/npm/mimer@1.0.0/dist/mimer.min.js"></script>
```

### fetch

Previously, this method returned the content of text files.  In the newer version, it returns 
a ReadableStream.  You can turn the stream into text with response.text().


# More Help

If you get stuck transitioning, contact me in the gitter chat (@jeff-zucker) or in the forum (@jeffz).