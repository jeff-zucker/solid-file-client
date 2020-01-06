<a href="../README.md">back to README</a>

# Using solid-file-client in a browser
```html
<!-- IMPORT SOLID-AUTH-CLIENT AND SOLID-FILE-CLIENT LIBRARIES
-->
<script src="https://cdn.jsdelivr.net/npm/solid-auth-client@2.3.0/dist-lib/solid-auth-client.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/solid-file-client@1.0.0/dist/window/solid-file-client.bundle.js"></script>

<script>
```
```javascript
// INSTANTIATE AUTH AND FILE-CLIENT OBJECTS
//
    const auth = solid.auth
    const fc   = new SolidFileClient(auth)

// DEFINE A URI THAT CONTAINS A POPUP LOGIN SCREEN
//
    const popUri = 'https://solid.community/common/popup.html'

// USE THE AUTH OBJECT TO LOGIN AND CHECK THE SESSION
// USE THE FILE-CLIENT OBJECT TO READ AND WRITE
//
    async function run(){
        let session = await auth.currentSession()
        if (!session) { session = await auth.popupLogin({ popupUri:popUri }) }
        console.log(`Logged in as ${session.webId}.`)
        let content = await fc.readFile( someUrl )
        console.log(content)
    }

    ...
```

