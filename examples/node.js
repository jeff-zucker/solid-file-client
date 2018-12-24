#!/usr/bin/env node
/*
 * YOU MUST ENTER THE FOLLOWING DATA
 *     your IDP, e.g. 'https://solid.community'
 *     your username at the IDP e.g. "jeffz"
 *     your password
 *     URL of a base directory where files can be written and deleted
 *        (the directory does not need to be public, the test logs you in)
 */
const fc  = require('../dist/node');
var batch = require('../src/batch');
const cfg = batch.getConfig({
    idp  : 'https://solid.community',
    user : 'jeffz',                  
    pass : '',          
    base : 'https://jeffz.solid.community/public/test/'
});
let test = require('../src/crudTest');
batch.run( test.crudTest(cfg) );

