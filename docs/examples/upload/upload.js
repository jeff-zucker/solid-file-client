//Jeff, I start my exploration in this file, this is only a dummy PR because I like comments a lot.
//must check lotsa links in my archive to find solid.authn. Finally after 3 1/2 years I touch code, thanx.
//feel free to delete the comments afterwards. many and little PRs. starting tomorrow.
//to keep the documentation in a minimum meaningful level, I check 
//https://docs.inrupt.com/developer-tools/javascript/client-libraries/authentication/ and will need solid-client-authn-browser I think

//here authn is needed
<!--new -->
const auth = solidClientAuthentication.getDefaultSession();      
const fileClient = new SolidFileClient( auth, { enableLogging: true })
<!--end new -->

/*old
document.getElementById('login').addEventListener('click', e => solid.auth.popupLogin({ popupUri: 'https://solid.community/common/popup.html' }))
document.getElementById('logout').addEventListener('click', e => solid.auth.logout())
solid.auth.trackSession(session => {
    if (!session) {
        $('.logged-in').hide()
        $('.logged-out').show()
    } else {
        $('.logged-in').show()
        $('.logged-out').hide()
        $('.webid').text(session.webId)
    }
})
*/
//new (taken from https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/authenticate-browser/)
 // 2. Start the Login Process if not already logged in.
  if (!getDefaultSession().info.isLoggedIn) {
    // The `login()` redirects the user to their identity provider;
    // i.e., moves the user away from the current page.
    await login({
      // Specify the URL of the user's Solid Identity Provider; e.g., "https://broker.pod.inrupt.com" or "https://inrupt.net"
      oidcIssuer: document.getElementById("oidc").value,
      // Specify the URL the Solid Identity Provider should redirect to after the user logs in,
      // e.g., the current page for a single-page app.
      redirectUrl: window.location.href,
      // Pick an application name that will be shown when asked 
      // to approve the application's access to the requested data.
      clientName: "solid-file-client-demo"
    });
  }
//end new

const setUploadStatus = isUploading => {
    if (isUploading) {
        $('.not-uploading').hide()
        $('.uploading').show()
    } else {
        $('.not-uploading').show()
        $('.uploading').hide()
    }
}
setUploadStatus(false)

const setLogStatus = showLogs => {
    if (showLogs) {
        $('.logs').show()
    } else {
        $('.logs').hide()
    }
}
const resetLogs = () => {
    setLogStatus(false)
    $('.logs').empty()
}
const addSuccessLog = msg => $('.logs').append(`<li class="list-group-item list-group-item-success">${msg}</li>`)
const addErrorLog = msg => $('.logs').append(`<li class="list-group-item list-group-item-danger">${msg}</li>`)
resetLogs()

const containerInput = document.getElementById('container')
const filesInput = document.getElementById('files')

document.getElementById('upload-form').addEventListener('submit', async e => {
    e.preventDefault()
    const parentContainer = containerInput.value + ((containerInput.value.endsWith('/')) ? '' : '/')
    const files = filesInput.files

    console.log(`Uploading ${files.length} file(s) to ${parentContainer}`)

    setUploadStatus(true)
    resetLogs()
    setLogStatus(true)
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const url = parentContainer + file.name

        console.log(`Uploading ${file.name} to ${url}`)
        try {
            // Uploading the file
            // Content can be a file from a html input
            // or a string. For json objects, use JSON.stringify(object)
            const res = await fileClient.putFile(url, file, file.type)
            const msg = `${res.status} Uploaded ${file.name} to ${res.url}`
            console.log(msg)
            addSuccessLog(msg)
        } catch (err) {
            console.error(err)
            addErrorLog(err.message)
        }
    }
    setUploadStatus(false)
})
