<a href="../README.md">back to README</a>

# Using solid-file-client in a browser
```
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
<!-- IMPORT SOLID-AUTH-CLIENT AND SOLID-FILE-CLIENT LIBRARIES
-->
<script src="https://cdn.jsdelivr.net/npm/solid-auth-client@2.3.0/dist-lib/solid-auth-client.bundle.js"></script>
<script src="https://cdn.jsdelivr.net/npm/solid-file-client@1.0.0/dist/window/solid-file-client.bundle.js"></script>

<script>
// INSTANTIATE AUTH AND FILE-CLIENT OBJECTS
//
    const auth = solid.auth
    const fc   = new SolidFileClient(auth)
    const someUrl = 'https://[url_you_want_to_read]'

// DEFINE A URI THAT CONTAINS A POPUP LOGIN SCREEN
//
    const popUri = 'https://solidcommunity.net/common/popup.html'

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

    run()
</script>
</head>
<body>
Take a look in the console
</body>
</html>

```


