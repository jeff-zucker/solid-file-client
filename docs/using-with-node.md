<a href="../README.md">back to README</a>


# Using Solid-File-Client with Node

When logging in from a node script, you may either pass the login credentials as an object, or store them in a file or in environment settings.  See the [solid-auth-cli](https://github.com/jeff-zucker/solid-auth-cli)  documentation for details of storing credentials.  Here's how to use a credential object in a script.
```javascript
    const credentials = {
        "idp"      : "https://solid.community", // or other identity provider
        "username" : "YOUR-USER-NAME",                  
        "password" : "YOUR-PASSWORD"
    }
    const auth = require('solid-auth-cli')
    const FC   = require('solid-file-client')
    const fc   = new FC( auth )
    async function run(){
        let session = await auth.currentSession()
        if (!session) { session = await auth.login(credentials) }
        console.log(`Logged in as ${session.webId}.`)
        if( fc.itemExists( someUrl )) {
            let content = fc.readFile( someUrl )
            // ... other file methods
            // ... and/or other auth methods
        }
    }
    run()

```


