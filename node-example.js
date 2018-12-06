/* solid-file-client node/require example
      Fetches my profile (a turtle file), or croaks the fetch error.
      Parses it into an RDF graph, or croaks the parse error.
      Finds my name in the graph and announces it

      To run this from the command line: node node-example
      please compile the code first!
*/

const $rdf = require('rdflib');
const fileClient = require('./js');

const subjectName = 'https://solside.solid.community/profile/card#me';
const nameIs = $rdf.sym('http://xmlns.com/foaf/0.1/name');
console.time();
fileClient.fetchAndParse(subjectName).then(graph => {
  if (!graph) {
    console.log(fileClient.err);
    return;
  }
  const subject = $rdf.sym(subjectName);
  const name = graph.any(subject, nameIs);
  console.log(`Hi, my name is ${name}.`);
  console.timeEnd();
});
/* That's all */
