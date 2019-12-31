After many months of work, @bourgeoa, @AA, and I are releasing version 1.0.0 of [Solid-File-Client]().  This library of methods to manage Solid files and folders now has the ability to copy or move entire folder trees from one pod to another or back and forth between a pod and a local file system.  It supports both text and binary files and works in either a browser or node/console context.  Also new in this version is extensive support for linked resources (.acl and .meta files). By default linked resources are copied, moved, and deleted with their associated resource, but options allow you to adjust that behavior as well as to discover the location of linked resources.

There are a number of changes which are not backward compatible.  Users of the old version of Solid-File-Client should see [Transitioning to Version 1.x](https://github.com/jeff-zucker/solid-file-client/blob/master/docs/transition-to-v.1.md).

Here is a complete working node script to upload and download images to and from your current local working directory.  Also take a look at the [Browser Upload Demo](https://jeff-zucker.github.io/solid-file-client/docs/examples/) which allows you upload to your pod without even having to install Solid-File-Client.
```javascript
const auth = require('solid-auth-cli') 
const FileClient = require('solid-file-client')
const fc = new FileClient(auth)

const remoteBase = "https://jeffz.solid.community/public/"
const localBase  = "file://" + process.cwd() + "/"  // current working folder
const local   = localBase + "square.png"
const remote  = remoteBase + "square.png"
const local2  = localBase + "square2.png"
const remote2 = remoteBase + "square2.png"

async function run(){
    try {
        await auth.login()
        await fc.copyFile( local,  remote )   // upload
        await fc.copyFile( remote, local  )   // download
        await fc.copyFile( remote, remote2 )  // copy btwn remote locations
        await fc.copyFile( local,  local2  )  // copy btwn local locations
    }
    catch(err) {
        console.log(err)
    }
}
run()
```
If you have questions, feel free to ask in the forum or on gitter.  For bug reports or feature suggestions, please use github issues and PRs.  If you don't know how to do that, ask!  :-)

Enjoy!    
