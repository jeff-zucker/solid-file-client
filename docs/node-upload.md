<a href="../README.md">back to README</a>

# DEMO OF USING COPYFILE IN NODE TO UPLOAD A LOCAL FILE TO A REMOTE POD
```javascript
const auth = require('../node_modules/solid-auth-cli')
const FileClient = require('../')
const fc = new FileClient(auth)

// CHANGE THIS REMOTE URL TO ONE IN YOUR OWN POD!
//
const remote = "https://jeffz.solid.community/public/square.png"
const local  = "file://" + process.cwd() + "/square.png"

async function run(){
    try {
        await auth.login()
        await fc.copyFile( local, remote )
    }
    catch(err) {
        console.log(err)
    }
}
run()
```

