import SolidApi from '../src/SolidApi'

// NOTE: js contains a j:Resource type. This shouldn't be common, but is currently a bug in NSS
const sampleFolder = `
@prefix : <#>.
@prefix pub: <>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix terms: <http://purl.org/dc/terms/>.
@prefix XML: <http://www.w3.org/2001/XMLSchema#>.
@prefix st: <http://www.w3.org/ns/posix/stat#>.
@prefix tur: <http://www.w3.org/ns/iana/media-types/text/turtle#>.
@prefix js: <js/>.
@prefix j: <http://www.w3.org/ns/iana/media-types/application/javascript#>.

pub:
    a ldp:BasicContainer, ldp:Container;
    terms:modified "2019-11-16T11:59:29Z"^^XML:dateTime;
    ldp:contains <notes.ttl>, js:;
    st:mtime 1573905569.399;
    st:size 4096.
<notes.ttl>
    a tur:Resource, ldp:Resource;
    terms:modified "2019-11-11T20:03:03Z"^^XML:dateTime;
    st:mtime 1573502583.164;
    st:size 16.
js:
    a ldp:BasicContainer, ldp:Container, ldp:Resource, j:Resource;
    terms:modified "2019-11-16T12:06:34Z"^^XML:dateTime;
    st:mtime 1573905994.593;
    st:size 4096.`


describe('readFolder', () => {
    const parent = 'https://example.org/'
    const name = 'my-folder'
    const url = `${parent}${name}/`
    const headerLink = '<file1.acl>; rel="acl"'
    const sampleResponse = {
        text: () => Promise.resolve(sampleFolder),
        headers: {
            get: key => (key === 'link') ? headerLink : null
        },
        ok: true,
        url
    }
    const fetch = jest.fn(() => Promise.resolve(sampleResponse))
    const api = new SolidApi(fetch)

    test('can read sampleFolder', async () => {
        const res = await api.readFolder(url)
        expect(res.type).toBe('folder')
        expect(res.name).toBe(name)
        expect(res.parent).toBe(parent)
        expect(res.url).toBe(url)
        expect(res.folders).toHaveLength(1)
        expect(res.files).toHaveLength(1)
    })

    test.todo('Add more tests')
})
