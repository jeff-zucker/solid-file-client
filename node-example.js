/* solid-file-client node/require example
      Fetches my profile (a turtle file), or croaks the fetch error.
      Parses it into an RDF graph, or croaks the parse error.
      Finds my name in the graph and announces it

      To run this from the command line: node node-example
      please compile the code first!
*/

    const $rdf = require('rdflib')
    const fileClient = require('./dist')
    var subj = 'https://solside.solid.community/profile/card#me'
    var pred = 'http://xmlns.com/foaf/0.1/name'
    fileClient.fetchAndParse( subj ).then( graph => {
        subj=$rdf.sym(subj)
        pred=$rdf.sym(pred)
        var name = graph.any(subj,pred)
        console.log(`Hi, my name is ${name}.`) 
     }, err => console.log(err) ) ;
/* That's all */
