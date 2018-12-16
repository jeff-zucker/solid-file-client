import $rdf from 'rdflib';
import * as fileClient from '../src';

test('Get data from public profile', () => {
  const subjectName = 'https://solside.solid.community/profile/card#me';
  const nameIs = $rdf.sym('http://xmlns.com/foaf/0.1/name');
  return fileClient.fetchAndParse(subjectName).then(graph => {
    if (!graph) {
      console.log(fileClient.err);
      return;
    }
    const subject = $rdf.sym(subjectName);
    const name = graph.any(subject, nameIs);
    return expect(name).toEqual({ termType: 'Literal', value: 'Jeff Zucker' });
  });
});
