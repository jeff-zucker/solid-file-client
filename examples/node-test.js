#!/usr/bin/env node
const fc  = require('../dist/console');
var batch = require('../src/batch');

fc.getCredentials().then( cfg => {
    cfg = batch.getConfig(cfg);
    let test = require('./common-base.js');
    batch.run( test.common(cfg) );
}, err => { croak("no file" + err) });

function croak(msg){
    batch.abort(`
        ${msg}
        To run this test, you must edit the file 
        ./examples/solid-credentials.json.
    `);
     process.exit()
}
