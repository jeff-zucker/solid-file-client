### Quick Start

* **Installing and Invoking**  [in the browser]() | [in nodejs]()

* **Choosing an error interface**  [catch interface]() |  [response interface]()

* **Handling duplicates, .acl, and .meta** [duplicatesOk]() | [noLinks]()

* **High-level methods**<pre>CONNECT   login, popupLogin, checkSession, logout
  CREATE    createFolder, createFile, copyFolder, copyFile
  READ      readFolder, readFile, fetchAndParse
  UPDATE    updateFile, sparqlUpdate, move, rename
  DELETE    deleteFile, deleteFolder
  UTILITIES upload,download, getHead, getOptions, itemExists, getLinks</pre>

* **Low-level methods**

  post, put, get, patch, delete 

  
### QUESTIONS FOR Alain and Otto

  * what other low-level methods should be in public documentation?

NOTES :
  * copyFolder = recursive copy;  
  * deleteFolder = recursive delete
  * updateFile = replace file
  * sparqlUpdate = patch with sparql params





### 

**Handling Links**

By default, any .acl and .meta files associated with a file or folder will be copied or deleted when the 
file or folder itself is copied or deleted.  If you do not want these files copied or deleted, set the
"noLinks" flag of the copy or delete command.

**Alternate Response Interface**

The default operation of all methods is to fail on error, leaving it up to the
developer to use catch() to trap the errors.  An alternate interface may be
invoked using an optional flag "responseInterface".  When this flag is set, methods
never fail and instead of using catch(), the developer checks the response object
for response.ok.  See:

   Using the catch interface   Using the response interface















  /* catch interface
  */
  let content = await fc.readFile(url).catch(e=>{show_err(e)})
  if(content) console.log(`Got content : ${content}`)

  let folder = await fc.readFolder(url).catch(e=>{show_err(e)})
  if(folder) console.log(`Folder has ${folder.files.length} files.`) 

  /* response interface
  */
  let response = await fc.readFile(url)
  if(!response.ok) show_err(response)
  else console.log(`Got content : ${response.body}`) 

  let response = await fc.readFolder(url)
  if(!response.ok) show_err(response)
  else console.log(`Folder has ${response.body.files.length} files.`) 



  let c = await fc.readFile(url).catch(e=>{show_err(e)})
  if(c) console.log(`Got content : ${c}`)

  let r = await fc.readFile(url)
  if(!r.ok) show_err(r)
  else console.log(`Got content : ${r.body}`) 

  let r = await fc.readFolder(url)
  if(!r.ok) show_err(r)
  else console.log(`Folder has ${r.body.files.length} files.`) 
  
  fc.readFile(url).then(
  ).catch(
    e=>{show_err(e)}
  )
  if(c) console.log(`Got content : ${c}`)

con
  * it breaks the existing interface

pro

1. If the user forgets to use catch, an error causes a big ugly
"unhandled rejection" message that doesn't really make clear who
forgot to handle it.

2. It's easy (for me at least) to typo when creating a catch, lots of 
symbols to type

3. If the user is is avoiding "await" for whatever reason, this kind of
thing becomes really difficult with catch:

  readFile.then( r=>{
    if(r.ok) do_X(r.body)
    else if(r.status==404) do_Y()
    else do_Z()
  })
