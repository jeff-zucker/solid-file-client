import SolidApi from '../src/SolidApi'
import { LINKS } from '../src/SolidApi'

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

const parentUrl = 'https://example.org/parent/'
const folderName = 'sample-folder'
const folderUrl = `${parentUrl}${folderName}/`

const sampleFolderWithoutLinks = {
    type: 'folder',
    itemType: 'Container',
    modified: '2019-11-16T11:59:29Z',
    mtime: '1573905569.399',
    size: '4096',
    name: folderName,
    parent: parentUrl,
    url: folderUrl,
    folders: [
        {
            type: 'folder',
            itemType: 'Container',
            modified: '2019-11-16T12:06:34Z',
            mtime: '1573905994.593',
            name: 'js',
            parent: folderUrl,
            size: "4096",
            url: `${folderUrl}js/`
        }
    ],
    files: [
        {
            type: 'text/turtle',
            itemType: 'Resource',
            modified: '2019-11-11T20:03:03Z',
            mtime: '1573502583.164',
            name: 'notes.ttl',
            parent: folderUrl,
            size: "16",
            url: `${folderUrl}notes.ttl`
        }
    ]
}

const sampleFolderObj = {
    ...sampleFolderWithoutLinks,
    links: {
        acl: `${folderUrl}.acl`,
        meta: `${folderUrl}.meta`
    },
    folders: [
        {
            ...sampleFolderWithoutLinks.folders[0],
//            links: {}
        }
    ],
    files: [
        {
            ...sampleFolderWithoutLinks.files[0],
            links: {
                acl: `${sampleFolderWithoutLinks.files[0].url}.acl`,
                meta: `${sampleFolderWithoutLinks.files[0].url}.meta`
            }
        }
    ]
}

const getPossibleLinks = url => {
    return {
        acl: `${url}.acl`,
        meta: `${url}.meta`
    }
}
const sampleFolderObjWithPossibleLinks = {
    ...sampleFolderObj,
    links: getPossibleLinks(sampleFolderObj.url),
    folders: [
        {
            ...sampleFolderObj.folders[0],
//            links: getPossibleLinks(sampleFolderObj.folders[0].url)
        }
    ],
    files: [
        {
            ...sampleFolderObj.files[0],
            links: getPossibleLinks(sampleFolderObj.files[0].url)
        }
    ]
}

// Maps urls of existing items to their description
const itemsMap = {
    [sampleFolderObj.url]: sampleFolderObj
}
sampleFolderObj.files.forEach(item => itemsMap[item.url] = item)
sampleFolderObj.folders.forEach(item => itemsMap[item.url] = item)

Object.entries(sampleFolderObj.links).forEach(([rel, url]) => itemsMap[url] = sampleFolderObj.links[rel])
sampleFolderObj.files.forEach(item => Object.entries(item.links).forEach(([rel, url]) => itemsMap[url] = item.links[rel]))
/*
sampleFolderObj.folders.forEach(item => Object.entries(item.links).forEach(([rel, url]) => itemsMap[url] = item.links[rel]))
*/
const sampleFetch = jest.fn(async (url, request) => {
    const createLink = url => `<${url}.acl>; rel="acl", <${url}.meta>; rel="describedBy"`
    const createResponse = (options = {}) => {
        return {
            url,
            text: () => Promise.resolve(options.body),
            headers: {
                get: key => (key === 'link') ? createLink(url) : null
            },
            ok: 'ok' in options ? options.ok : true,
            status: 'status' in options ? options.status : 200
        }
    }

    if (url === sampleFolderObj.url)
        return createResponse({ body: sampleFolder })
    if (url in itemsMap)
        return createResponse()
    return createResponse({ status: 404, ok: false })
})
beforeEach(() => sampleFetch.mockClear())

const api = new SolidApi(sampleFetch)

describe('readFolder', () => {
    describe('EXCLUDE links', () => {
        test('can read sample folder', async () => {
            const res = await api.readFolder(sampleFolderObj.url)
            expect(res).toEqual(sampleFolderWithoutLinks)
            expect(sampleFetch).toHaveBeenCalledTimes(1)
        })
    })

    describe('INCLUDE links', () => {
        test('can read sample folder with existing links', async () => {
            const res = await api.readFolder(sampleFolderObj.url, { links: LINKS.INCLUDE })
            expect(res).toEqual(sampleFolderObj)
//            expect(sampleFetch).toHaveBeenCalledTimes(1 + 3 + 6)
            expect(sampleFetch).toHaveBeenCalledTimes(1 + 6)
        })
    })

    describe('INCLUDE_POSSIBLE links', () => {
        test('can read sample folder with possible links', async () => {
            const res = await api.readFolder(sampleFolderObj.url, { links: LINKS.INCLUDE_POSSIBLE })
            expect(res).toEqual(sampleFolderObjWithPossibleLinks)
//            expect(sampleFetch).toHaveBeenCalledTimes(1 + 3)
            expect(sampleFetch).toHaveBeenCalledTimes(3)
        })
    })

    test.todo('Add more tests')
})
