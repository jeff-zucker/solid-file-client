#!/usr/bin/env node
const fc  = require('../dist/node/solid-file-client.bundle');
var batch = require('./batch');

fc.getCredentials().then( cfg => {
    cfg = batch.getConfig(cfg);
    let test = require('./common-base.js');
    batch.run( test.common(cfg) );
}, err => { croak("no file" + err) });

function croak(msg){
    batch.abort(`
        ${msg}
    `);
     process.exit()
}
