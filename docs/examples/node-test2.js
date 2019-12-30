#!/usr/bin/env node
/*
 * You must edit the file ./solid-credentials.json to run this test
 */
const fc  = require('../dist/node/solid-file-client.bundle');
var batch = require('./batch');
fc.getCredentials().then( cfg => {
    if(!cfg.password) croak("no pass");
    cfg = batch.getConfig(cfg);
    let test = require('./node-base.js');
    batch.run( test.node(cfg) );
}, err => { croak("no file" + err) });

function croak(msg){
    batch.abort(`
        ${msg}
        To run this test, you must edit the file 
        ./examples/solid-credentials.json.
         
    `);
}
