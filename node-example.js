/* solid-file-client node/require example
      Fetches my profile (a turtle file), or croaks the fetch error.
      Parses it into an RDF graph, or croaks the parse error.
      Finds my name in the graph and announces it

      To run this from the command line: node node-example
*/
    const fileClient = require('./solid-file-client')
    var subj = 'https://solside.solid.community/profile/card#me'
    var pred = 'http://xmlns.com/foaf/0.1/name'
    fileClient.fetchAndParse( subj ).then( graph => {
        if(!graph) {
            console.log(fileClient.err); return;
        }
        subj=$rdf.sym(subj)
        pred=$rdf.sym(pred)
        var name = graph.any(subj,pred)
        console.log(`Hi, my name is ${name}.`) 
     })     
/* That's all */
