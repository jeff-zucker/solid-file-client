#!/usr/bin/env node
const fc  = require('../src');
var batch = require('../src/batch');

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
