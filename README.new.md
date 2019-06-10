### Quick Start

* **Installing and Invoking**  [in the browser](#installBrowser) | [in nodejs](#installNode)

* **Choosing an error interface**  [catch interface]() |  [response interface]()

* **Handling duplicates, .acl, and .meta** [duplicatesOk]() | [noLinks]()

* **High-level methods**<pre>**CONNECT**   [login](), [popupLogin](), [checkSession](), [logout]()
  **CREATE**    [createFolder](), [createFile](), [copyFolder], [copyFile]
  **READ**      [readFolder](), [readFile](), [fetchAndParse]()
  **UPDATE**    [updateFile], [sparqlUpdate], [move], [rename]
  **DELETE**    [deleteFile](), [deleteFolder]
  **UTILITIES** [upload],[download], [getHead], [getOptions], [itemExists], [getLinks]</pre>

* **Low-level methods**

  post, put, get, patch, delete 

  
### QUESTIONS FOR Alain and Otto

  * what other low-level methods should be in public documentation?

### NOTES :
  * copyFolder = recursive copy;  
  * deleteFolder = recursive delete
  * updateFile = replace file
  * sparqlUpdate = patch with sparql params

### <a href="" name="installBrowser">Installing and Invoking in the Browser</a>

### <a href="" name="installNode">Installing and Invoking in NodeJS</a>


### Read Methods

  readFile      returns content as a string or a blob depending on file type
  fetchAndParse returns content as an rdflib graph object or a JSON object depending on file type
  get           returns content as a readable stream