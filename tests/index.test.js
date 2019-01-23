import $rdf from 'rdflib';
import * as fileClient from '../lib';

const profile = 'https://jeffz.solid.community/profile/card#me';

test('Use readFile() to get data from a public profile', () => {
    return fileClient.readFile(profile).then( text => {
        let got = (text.match(/Jeff Zucker/)) ? 1 : 0;
        return expect(got).toEqual(1);
    }, err => { console.log(err); return; });
});
test('Use readFolder() to get data from a public folder', () => {
    let folder = profile.replace(/card#me/,'');
    return fileClient.readFolder(folder).then( folderObject => {
        return expect(folderObject.files.length).toEqual(1);
    }, err => { console.log(err); return; });
});
test('Use fetchAndParse() to get data from a public profile', () => {
    const nameIs = $rdf.sym('http://xmlns.com/foaf/0.1/name');
    return fileClient.fetchAndParse(profile).then(graph => {
        const subject = $rdf.sym(profile);
        const name = graph.any(subject, nameIs).value;
        return expect(name).toEqual('Jeff Zucker');
    }, err => { console.log(err); return; });
});
