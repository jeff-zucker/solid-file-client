//Jeff, I start my exploration in this file, this is only a dummy PR because I like comments a lot.
//must check lotsa links in my archive to find solid.authn. Finally after 3 1/2 years I touch code, thanx.
//feel free to delete the comments afterwards. many and little PRs. starting tomorrow.
//to keep the documentation in a minimum meaningful level, I check 
//https://docs.inrupt.com/developer-tools/javascript/client-libraries/authentication/ and will need solid-client-authn-browser I think
const fileClient = new SolidFileClient(solid.auth, { enableLogging: true })

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
