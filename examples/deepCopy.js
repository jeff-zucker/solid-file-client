#!/usr/bin/env node
const auth = require('../src/solid-shell-client')
const deep = require('./recurse.js')
/* --------------------------------------------------------------- */
/* CHANGE THESE 
*/
var source  = "https://jeffz.solid.community/public/solidsite2"
var target  = "https://jeffz.solid.community/public/solidsite3"
var credentials = {
    "idp"      : "https://solid.community",
    "username" : "jeffz",                  
    "password" : "",
} /* ------------------------------------------------------------- */
console.log(`loging in`)
auth.login( credentials ).then( session => {
    console.log(`logged in as <${session.webID}>`)
    deep.copyFolder( source, target ).then( ()=> {
        console.log(`All done!`);
    },e => console.log("Error copying : "+e))
},e => console.log("Error logging in : "+e))
/* END */
