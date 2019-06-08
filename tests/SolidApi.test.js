import auth from 'solid-auth-cli';
import $rdf from 'rdflib';
import SolidApi from '../src/SolidApi'

const base = "file://" + process.cwd()
const folder = base + "/test-folder/solid-api/"
const inexistentFolder = folder + "inexistent/"

const api = new SolidApi(auth.fetch.bind(auth), $rdf);

// Create container
beforeAll(() => api.createFolder(folder))

test('deleteFolderContents throws response if folder doesn\'t exist', () => {
  return expect(api.deleteFolderContents(inexistentFolder)).rejects.toHaveProperty('status', 404)
})