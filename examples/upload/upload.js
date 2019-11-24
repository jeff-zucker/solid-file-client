
const fileClient = new SolidFileClient(solid.auth, { enableLogging: true })

document.getElementById('login').addEventListener('click', e => fileClient.popupLogin())
document.getElementById('logout').addEventListener('click', e => fileClient.logout())
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
    const from = containerInput.value + ((containerInput.value.endsWith('/')) ? '' : '/')
    console.log('from', from)
    console.log('container', containerInput.value)
    const files = filesInput.files

    setUploadStatus(true)
    resetLogs()
    setLogStatus(true)
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const url = from + file.name
        console.log(`Uploading ${file.name} to ${url}`)
        try {
            const res = await fileClient.updateFile(url, file, file.type)
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