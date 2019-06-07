import $rdf from 'rdflib';
import auth from 'solid-auth-cli'
import SolidFileClient from '../src/index';

const fileClient = new SolidFileClient(auth)
SolidFileClient.setRdflib($rdf)
const profile = 'https://jeffz.solid.community/profile/card#me';

test('Use get() to get data from a public profile', () => {
    return fileClient.get(profile)
        .then(res => res.text())
        .then(text => expect(text.match(/Jeff Zucker/)).toBeTruthy())
});
// test('Use get() to get data from a public folder', () => {
//     const folder = profile.replace(/card#me/,'');
//     return fileClient.readFolder(folder).then( folderObject => {
//         return expect(folderObject.files.length).toEqual(1);
//     }, err => { console.log(err); return; });
// });
// test('Use fetchAndParse() to get data from a public profile', () => {
//     const nameIs = $rdf.sym('http://xmlns.com/foaf/0.1/name');
//     return fileClient.fetchAndParse(profile).then(graph => {
//         const subject = $rdf.sym(profile);
//         const name = graph.any(subject, nameIs).value;
//         return expect(name).toEqual('Jeff Zucker');
//     }, err => { console.log(err); return; });
// });
