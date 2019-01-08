#!/usr/bin/env node

const auth  = require('../src/solid-shell-client')
const $rdf  = require('../node_modules/rdflib/src') // MODIFIED VERSION

const kb      = $rdf.graph()
const fetcher = $rdf.fetcher(kb)
const ldp     = $rdf.Namespace('http://www.w3.org/ns/ldp#')
const RDF     = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

/* --------------------------------------------------------------- */
/* CHANGE THESE 
*/
var folder      = "SOME-RESOURCE-REQUIRING-YOUR-LOGIN"
var credentials = {
    "idp"      : "YOUR-IDP e.g. https://solid.community",
    "username" : "YOUR-USER-NAME",                  
    "password" : "YOUR-PASSWORD",
}
/* --------------------------------------------------------------- */

folder = kb.sym(folder)

auth.login( credentials ).then( session => {
    console.log(`logged in as <${session.webID}>`)
    fetcher.load(folder).then(function(response) {
        var contents = kb.each(folder, ldp('contains') )
        console.log(`Folder contains ${contents.length} items.`);
    },e => console.log("Error fetching : "+e))
},e => console.log("Error logging in : "+e))

/* END */
