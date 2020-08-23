import SolidFileClient from '../src/index'

import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import errorUtils from '../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const { getAuth, getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator


const getRootUrl = url => {
  const base = url.split('/')
  let rootUrl = base[0]
  let j = 0
  for (let i = 1; i < base.length - 1; i++) {
    j = i
    if (base[i] === '') { rootUrl += '/' }
    break
  }
  rootUrl = rootUrl + '/' + base[j + 1] // + ('/')
  return rootUrl
}

/** @type {SolidApi} */
let api

const container = new BaseFolder(getTestContainer(), 'SolidApi-links')

jest.setTimeout(30 * 1000)

beforeAll(async () => {
  await contextSetup()
//  api = new SolidApi(getFetch())
  api = new SolidFileClient(getAuth())
  await container.reset()
})

describe('copying links', () => {
    const createPseudoAcl = (itemUrl, rootUrl, acldefault = '') => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${rootUrl}/profile/card#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo <${itemUrl}>;
    n0:agent <${rootUrl}/profile/card#me>;
    n0:agent c:me;
    n0:agentClass n1:Agent;${acldefault}
    n0:mode n0:Control, n0:Read, n0:Write.
`
const otherPseudoAcl = (itemUrl, rootUrl, acldefault = '') => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${rootUrl}/profile/card#>.

:ReadWrite
    n0:accessTo <${itemUrl}>;
    n0:agent <${rootUrl}/profile/card#me>;
    n0:agent c:me;
    n0:agentClass n1:Agent;${acldefault}
    n0:mode n0:Read, n0:Write.
`
    const invalidPseudoAcl = (rootUrl) => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${rootUrl}/profile/card#>.

:invalid
    n0:agent c:me;
    n0:mode n0:Read, n0:Write.
`
const aclDefault = '\n    n0:default <./>;'

const fileWithAcl = new File('child-file.txt', 'I am a child', 'text/plain', {
        acl: true,
        placeholder: { meta: true }
    }) // Note: Acl Content will be overriden by some tests
    const targetWithAcl = new File('target.txt', 'target', 'text/plain', {
        placeholder: { acl: true }
    })
    const fileWithLinks = new File('file-with-links.txt', 'file with links', 'text/plain', {
        acl: true
    })
    const folderWithAcl = new Folder('folder-with-acl', [], {
        acl: true, // Note: Content will be overriden by some tests
        placeholder: { meta: true }
    })
    const folderWithMeta = new Folder('folder-target', undefined, {
        meta: true,
        placeholder: { acl: true }
    })
    const filePlaceholder = new FilePlaceholder('file-placeholder.txt', 'file with placeholder', 'text/plain', {
        placeholder: {
            acl: true,
						meta: false
        }
    })
    const folderPlaceholder = new FolderPlaceholder('folder-placeholder', [], {
        placeholder: { acl: true, meta: true }
    })

    const folder = new BaseFolder(container, 'copying-links', [
        fileWithAcl,
        folderWithAcl,
        folderWithMeta,
        new Folder('nested', [
            targetWithAcl
        ]),
        fileWithLinks,
        filePlaceholder,
        folderPlaceholder
    ])

    beforeEach(() => folder.reset())

    describe('isValidAcl', () => {
        test('content is not acl and is valid RDF', async () => {
            const content = '<#> a <test>.'
            return expect(api.isValidAcl(fileWithAcl.url, content))
              .rejects.toThrow('URI is needed')
        })
        test('content is not a valid RDF', async () => {
            const content = '<#> a <test>'
            const res = await api.isValidAcl(fileWithAcl.url, content, '/profile/card#me')
            expect(res.err[0]).toEqual('incorrect RDF')
            const rdfError = new Error('Expected entity but got eof on line 1.')
            expect(res.info[0]).toEqual(rdfError)
        })
        test('url must not end with .acl', async () => {
            return expect(api.isValidAcl(fileWithAcl.acl.url, 'aclContent', '/profile.card#me'))
              .rejects.toThrow('not the auxillary link acl')
        })
        test('file acl content is valid with relative notation', async () => {
            const aclContent = createPseudoAcl('./'+fileWithAcl.name, '')
            const res = await api.isValidAcl(fileWithAcl.url, aclContent, '/profile/card#me')
            expect(res.err).toEqual([])
            expect(res.info).toEqual([])
        })
        test('file acl content is not valid', async () => {
            const aclContent = invalidPseudoAcl('')
            const res = await api.isValidAcl(fileWithAcl.url, aclContent, '/profile/card#me')
            expect(res.err).toEqual(['"invalid" has no acl:Authorization', '"invalid" has no acl:accessTo', 'no acl:Control'])
            expect(res.info).toEqual([])
        })
        test('folder acl content is not valid', async () => {
            const aclContent = invalidPseudoAcl('')
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, '/profile/card#me')
            expect(res.err).toEqual(['"invalid" has no acl:Authorization', '"invalid" has no acl:accessTo', '"invalid" has no acl:default - you cannot inherit', 'no acl:Control'])
            expect(res.info).toEqual([])
        })
        test('file acl content is valid with absolute notation (against webId relative)', async () => {
            const aclContent = createPseudoAcl(fileWithAcl.url, getRootUrl(fileWithAcl.url))
            const res = await api.isValidAcl(fileWithAcl.url, aclContent, '/profile/card#me')
            // expect(fileWithAcl.acl.content).toEqual('')
            expect(res.err).toEqual([])
            expect(res.info).toEqual(['you could use relative notation'])
        })
        test('file acl content is valid with absolute notation (against webId absolute)', async () => {
            const aclContent = createPseudoAcl(fileWithAcl.url, '')
            const webId = getRootUrl(fileWithAcl.url) + '/profile/card#me'
            const res = await api.isValidAcl(fileWithAcl.url, aclContent, webId)
            expect(res.err).toEqual([])
            expect(res.info).toEqual(['you could use relative notation'])
        })
        test('folder acl content is valid with absolute notation (against webId absolute)', async () => {
            const aclContent = createPseudoAcl(folderWithAcl.url, '', aclDefault)
            const webId = getRootUrl(folderWithAcl.url) + '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId)
            expect(res.err).toEqual([])
            expect(res.info).toEqual(['you could use relative notation'])
        })
         test('folder acl content has not a valid URI for acl:default', async () => {
            const aclContent = createPseudoAcl('./', '', '\n    n0:default <./item>;')
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId)
            expect(res.err[0]).toMatch('invalid acl:default URI')
            expect(res.info).toEqual([])
        })
        test('folder acl content has not a valid URI for acl:accessTo', async () => {
            const aclContent = createPseudoAcl('./', '', '\n    n0:default <./item>;')
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId)
            expect(res.err[0]).toMatch('invalid acl:default URI')
            expect(res.info).toEqual([])
        })
        test('folder acl content has not a valid URI for acl:accessTo', async () => {
            const aclContent = createPseudoAcl('./item', '', aclDefault)
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId)
            expect(res.err[0]).toMatch('invalid acl:accessTo URI')
            expect(res.info).toEqual([])
        })
        test('folder acl content has no acl:default with options aclDefault=may', async () => {
            const aclContent = createPseudoAcl('./', '')
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId, { aclDefault: 'may' })
            expect(res.err).toEqual([])
            expect(res.info[0]).toMatch('no acl:default')
        })
        test('folder acl content has no acl:Authorization and no acl:Control with options aclAuth=may', async () => {
            const aclContent = otherPseudoAcl('./', '', aclDefault)
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId, { aclAuth: 'may' })
            expect(res.err[0]).toMatch('no acl:Control')
            expect(res.info[0]).toMatch('no acl:Authorization')
        })
        test('folder acl content has acl:Write with options aclMode:Write (and no acl:Authorization with options aclAuth=may', async () => {
            const aclContent = otherPseudoAcl('./', '', aclDefault)
            const webId = '/profile/card#me'
            const res = await api.isValidAcl(folderWithAcl.url, aclContent, webId, { aclMode: 'Write', aclAuth: 'may' })
            expect(res.err).toEqual([])
            expect(res.info[0]).toMatch('no acl:Authorization')
        })
    })
    describe('isValidRDF', () => {
        test('content is a valid RDF', async () => {
            const content = '<#> a <test>.'
            const res = await api.isValidRDF(fileWithAcl.url, content)
            expect(res.info).toEqual([])
            expect(res.err).toEqual([])
        })
        test('content is not a valid RDF', async () => {
            const content = '<#> a <test>'
            const res = await api.isValidRDF(fileWithAcl.url, content)
            const rdfError = new Error('Expected entity but got eof on line 1.')
            expect(res.info).toEqual([rdfError])
        })

    })
})
