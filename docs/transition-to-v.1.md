# Changes introduced with v1.0.0
When stated **contentType** is allways needed, and file should have a compatible extension

examples : **text.ttl** for **text/turtle**, no extension **bar** is considered **octet/stream**

## Libraries
- rdflib is not used anymore
- solid-auth... :
  - for node.js/console : use **solid-auth-cli**
  - for browser : **solid-auth-client** is not included and must be added 
```
    <script src="https://cdn.jsdelivr.net/npm/solid-auth-client@2.3.0/dist-lib/solid-auth-client.bundle.js"></script>
```
## Method linked to libraries not included
- fetchAndParse() is discarded 
- session functions are discarded 
- see examples in [sessionUtils](./sessionUtils.js)
```
var auth = solid.auth;
const session = new sessionUtils(auth)
const fc = new SolidFileClient(auth);         // from solid-file-client.bundle.js
```
checkSession return webId || undefined (used to be session Object || false)

## Other functions :
- fc.update() is discarded, replaced by fc.putFile()
- fc.fetch do not return body
```
  var response = await fc.fetch(thing.url, { headers: { "Accept": "text/turtle" }})
  if(!response.ok){ self.err=fc.err; return false }
  var body = await response.text()
```
- fc.guessFileType is discarded, if needed can be replaced :  
  - in node.js/console : npm mime-types
  - in browser with window.Mimer
```
  <script src="https://cdn.jsdelivr.net/npm/mimer@1.0.0/dist/mimer.min.js"></script>
```
- fc.readFolder()
  - no folder.content (access body from fc.fetch(folderUrl)))
  - no files.label (file.label = decodeURIComponent(f.name))
