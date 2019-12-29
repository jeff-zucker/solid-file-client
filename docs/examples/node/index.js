const auth = require('solid-auth-cli')
const SolidFileClient = require('../../dist/node/solid-file-client.bundle.js')

const client = new SolidFileClient(auth)
console.log('Created a new SolidFileClient', client)