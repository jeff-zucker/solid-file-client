// file docs/examples/advanced/copy.js
// restructure february 2022 @ewingson
//
//code goes here
//?

async function main(session){

const auth = solidClientAuthentication.getDefaultSession();      
const fileClient = new SolidFileClient( auth, { enableLogging: true });

const setCopyStatus = isCopying => {
            if (isCopying) {
                $('.not-copying').hide()
                $('.copying').show()
            } else {
                $('.not-copying').show()
                $('.copying').hide()
            }
        }
        setCopyStatus(false)

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

        const fromInput = document.getElementById('src')
        const destInput = document.getElementById('dest')
        const createPathInput = document.getElementById('create-path')
        const withAclInput = document.getElementById('with-acl')
        const withMetaInput = document.getElementById('with-acl')
        const getMergeInput = () => document.querySelector('input[name="merge-option"]:checked')

        document.getElementById('copy-form').addEventListener('submit', async e => {
            e.preventDefault()
            const from = fromInput.value
            const to = destInput.value
            const createPath = createPathInput.checked
            const withMeta = withMetaInput.checked
            const withAcl = withAclInput.checked

            const mergeVal = getMergeInput().value
            let merge = REPLACE
            if (mergeVal === 'keep-source')
                merge = KEEP_SOURCE
            else if (mergeVal === 'keep-target')
                merge = KEEP_TARGET
            

            const responseToMsg = response => `${response.status} ${response.statusText} ${response.url}`
            try {
                setCopyStatus(true)
                resetLogs()

                // Copy a file or folder
                const res = await fileClient.copy(from, to, {
                    merge,
                    createPath,
                    withAcl,
                    withMeta
                })
                res.forEach(response => {
                    const msg = responseToMsg(response)
                    console.log(msg)
                    addSuccessLog(msg)
                })
            } catch (err) {
                err.rejectedErrors.forEach(err => {
                    console.error(err)
                    addErrorLog(err.message)
                })
            }
            setCopyStatus(false)
            setLogStatus(true)
        })
//this seems to be the actual copy command
const { MERGE: { REPLACE, KEEP_SOURCE, KEEP_TARGET } } = SolidFileClient;

}
