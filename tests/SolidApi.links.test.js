import SolidApi, { LINKS, AGENT } from '../src/SolidApi'
import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import errorUtils from '../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const { getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator

const libPath = require('path')

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
  api = new SolidApi(getFetch())
  await container.reset()
})

describe('getItemLinks', () => {
    const childFile = new File('child-file.txt', 'I am a child', 'text/plain', { acl: true, placeholder: { meta: true } })
    const otherChildFile = new File('other-child-file.txt', 'I am another child', 'text/plain', { placeholder: { acl: true } })

    const folder = new BaseFolder(container, 'getItemLinks', [
        childFile,
        otherChildFile,
    ], { acl: true, placeholder: { meta: true } })

    beforeAll(() => folder.reset())

    test('returns possible acl and meta links for a file without any options', async () => {
        const links = await api.getItemLinks(childFile.url)
        expect(links).toHaveProperty('acl', childFile.acl.url)
        expect(links).toHaveProperty('meta', childFile.meta.url)
    })
    test('returns possible acl and meta links for a folder without any options', async () => {
        const links = await api.getItemLinks(folder.url)
        expect(links).toHaveProperty('acl', folder.acl.url)
        expect(links).toHaveProperty('meta', folder.meta.url)
    })
    test('returns existing acl and meta links for a file with links=INCLUDE', async () => {
        const links = await api.getItemLinks(otherChildFile.url, { links: LINKS.INCLUDE })
        expect(links).not.toHaveProperty('acl')
//        expect(links).toHaveProperty('meta', otherChildFile.meta.url)
    })
    test('returns existing acl and meta links for a folder with links=INCLUDE', async () => {
        const links = await api.getItemLinks(folder.url, { links: LINKS.INCLUDE })
        expect(links).toHaveProperty('acl', folder.acl.url)
        expect(links).not.toHaveProperty('meta')
    })
    test('throws if links=EXCLUDE', () => {
        return expect(api.getItemLinks(folder.url, { links: LINKS.EXCLUDE })).rejects.toThrow(/Invalid option/)
    })
})

describe('copying links', () => {
    const createPseudoAcl = (itemUrl, itemName, rootUrl) => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${rootUrl}/profile/card#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo <${itemUrl}>;
    n0:accessTo <./${itemName}>;
    n0:agent <${rootUrl}/profile/card#me>;
    n0:agent c:me;
    n0:agentClass n1:Agent;
    n0:default <./>;
    n0:mode n0:Control, n0:Read, n0:Write.
`
    const expectedPseudoAcl = (newItemName, newRootUrl) => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${newRootUrl}/profile/card#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo <./${newItemName}>;
    n0:accessTo <./${newItemName}>;
    n0:agent <${newRootUrl}/profile/card#me>;
    n0:agent c:me;
    n0:agentClass n1:Agent;
    n0:default <./>;
    n0:mode n0:Control, n0:Read, n0:Write.
`
const fileWithAcl = new File('child-file.txt', 'I am a child', 'text/plain', {
        acl: true,
        placeholder: { meta: true }
    }) // Note: Acl Content will be overriden by some tests
    const targetWithAcl = new File('target.txt', 'target', 'text/plain', {
//        meta: false,
        placeholder: { acl: true }
    })
    const fileWithLinks = new File('file-with-links.txt', 'file with links', 'text/plain', {
//        meta: new File('file-with-links.txt.meta', undefined, undefined, {
//            acl: true
//        }),
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
//            meta: new FilePlaceholder('file-placeholder.txt.meta', undefined, undefined, {
//                placeholder: { acl: true }
//            })
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

    describe('copyAclFileForItem', () => {
        test('copies acl file of a file to new location', async () => {
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url)
            await expect(api.itemExists(targetWithAcl.acl.url)).resolves.toBe(true)
        })
        test('modify paths in acl file of a file to match new location', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name, '')
            const expectedAcl = expectedPseudoAcl(targetWithAcl.name, '')
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url)
            await expect(api.get(targetWithAcl.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify relative paths in acl file of a file to match new location agent:to_source', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name, '')
            const expectedAcl = expectedPseudoAcl(targetWithAcl.name, getRootUrl(fileWithAcl.url)) //'app://ls')
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url, { agent: AGENT.TO_SOURCE })
            await expect(api.get(targetWithAcl.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify absolute paths in acl file of a file to match new location agent:to_source', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name, getRootUrl(fileWithAcl.url)) // '')
            const expectedAcl = expectedPseudoAcl(targetWithAcl.name, getRootUrl(fileWithAcl.url)) //'app://ls')
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url, { agent: AGENT.TO_SOURCE })
            await expect(api.get(targetWithAcl.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify absolute paths in acl file of a file to match new location agent:to_target', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name, getRootUrl(fileWithAcl.url)) // 'app://ls')
            const expectedAcl = expectedPseudoAcl(targetWithAcl.name, '')
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url, { agent: AGENT.TO_TARGET })
            await expect(api.get(targetWithAcl.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test.skip('modify relative paths in acl file of a file to match new location agent:to_target', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name, '') // 'app://ls')
            const expectedAcl = expectedPseudoAcl(targetWithAcl.name, '')
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url, { agent: AGENT.TO_TARGET })
            await expect(api.get(targetWithAcl.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify paths in acl file of a folder to new location', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '', '')
            const expectedAcl = expectedPseudoAcl('', '')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url)
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify relative paths in acl file of a folder to match new location agent:to_source', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '', '')
            const expectedAcl = expectedPseudoAcl('', getRootUrl(folderWithAcl.url)) //'app://ls')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url, { agent: AGENT.TO_SOURCE })
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify absolute paths in acl file of a folder to match new location agent:to_source', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '', getRootUrl(folderWithAcl.url)) // '')
            const expectedAcl = expectedPseudoAcl('', getRootUrl(folderWithAcl.url)) //'app://ls')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url, { agent: AGENT.TO_SOURCE })
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify absolute paths in acl file of a folder to match new location agent:to_target', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '', getRootUrl(folderWithAcl.url)) // 'app://ls')
            const expectedAcl = expectedPseudoAcl('', '')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url, { agent: AGENT.TO_TARGET })
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify relative paths in acl file of a folder to match new location agent:to_target', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '', '') // 'app://ls')
            const expectedAcl = expectedPseudoAcl('', '')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url, { agent: AGENT.TO_TARGET })
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('responds with put response', async () => {
            const res = await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url)
            expect(res).toHaveProperty('status', 201)
            expect(res).toHaveProperty('url', targetWithAcl.acl.url)
        })
        test('fails with 404 if source acl does not exist', () => {
            return rejectsWithStatus(api.copyAclFileForItem(targetWithAcl.url, fileWithAcl.url), 404)
        })
    })

    describe('copyMetaFileForItem', () => {
        test.skip('copies meta file of a file to new location', async () => {
            await api.copyMetaFileForItem(targetWithAcl.url, fileWithAcl.url)
            await expect(api.get(fileWithAcl.meta.url).then(res => res.text())).resolves.toEqual(targetWithAcl.meta.content)
        })
        test('copies meta file of a folder to new location', async () => {
            await api.copyMetaFileForItem(folderWithMeta.url, folderWithAcl.url)
            await expect(api.get(folderWithAcl.meta.url).then(res => res.text())).resolves.toEqual(folderWithMeta.meta.content)
        })
        test('responds with put response', async () => {
            const res = await api.copyAclFileForItem(fileWithAcl.url, targetWithAcl.url)
            expect(res).toHaveProperty('status', 201)
            expect(res).toHaveProperty('url', targetWithAcl.acl.url)
        })
        test('fails with 404 if source meta does not exist', () => {
            return rejectsWithStatus(api.copyMetaFileForItem(fileWithAcl.url, targetWithAcl.url), 404)
        })
    })

    describe('copyLinksForItem', () => {
        const optionsAll = {
            withAcl: true,
            withMeta: true
        }

        test('copies acl if existing', async () => {
            await api.copyLinksForItem(fileWithAcl.url, targetWithAcl.url, optionsAll)
            await expect(api.itemExists(targetWithAcl.acl.url)).resolves.toBe(true)
        })
        test.skip('copies meta if existing', async () => {
            await api.copyLinksForItem(targetWithAcl.url, fileWithAcl.url, optionsAll)
            await expect(api.itemExists(fileWithAcl.meta.url)).resolves.toBe(true)
        })
        test('does not fail with 404 if no link exists', () => {
            return expect(api.copyLinksForItem(folder.url, folderWithAcl.url, optionsAll)).resolves.toEqual([])
        })
        test('does not copy if options={}', async () => {
            await api.copyLinksForItem(fileWithAcl.url, targetWithAcl.url, {})
            await expect(api.itemExists(targetWithAcl.acl.url)).resolves.toBe(false)
        })
    })

    describe('copyFile', () => {
        test('also copies acl, meta and meta.acl if existing', async () => {
            await api.copyFile(fileWithLinks.url, filePlaceholder.url)
            await expect(api.itemExists(filePlaceholder.acl.url)).resolves.toBe(true)
//            await expect(api.itemExists(filePlaceholder.meta.url)).resolves.toBe(true)
//            await expect(api.itemExists(filePlaceholder.meta.acl.url)).resolves.toBe(true)
        })
        test('copies no links if withMeta=false and withAcl=false', async () => {
            await api.copyFile(fileWithLinks.url, filePlaceholder.url, { withAcl: false, withMeta: false })
            await expect(api.itemExists(filePlaceholder.acl.url)).resolves.toBe(false)
//            await expect(api.itemExists(filePlaceholder.meta.url)).resolves.toBe(false)
//            await expect(api.itemExists(filePlaceholder.meta.acl.url)).resolves.toBe(false)
        })
    })

    describe('_deleteItemWithLinks', () => {
        test('deletes meta, meta.acl and acl of file', async () => {
            await api._deleteItemWithLinks(fileWithLinks.url)
            await expect(api.itemExists(fileWithLinks.url)).resolves.toBe(false)
            await expect(api.itemExists(fileWithLinks.acl.url)).resolves.toBe(false)
//            await expect(api.itemExists(fileWithLinks.meta.url)).resolves.toBe(false)
//            await expect(api.itemExists(fileWithLinks.meta.acl.url)).resolves.toBe(false)
        })
    })
})

describe('recursive', () => {
    const contents = [
        new File('file-with-links.txt', 'file with links', 'text/plain', {
            acl: true,
//            meta: new File('file-with-links.txt.meta', undefined, undefined, { acl: true })
        }),
        new File('file-with-acl.txt', 'file with acl', 'text/plain', { acl: true }),
        new Folder('nested', [
            new File('nested-file.txt', 'nested file', 'text/plain')
        ])
    ]
    const source = new Folder('source', contents, {
        meta: true
    })
    const target = new FolderPlaceholder('target', contents.map(child => child.clone()), {
        placeholder: { meta: true }
    })
    const mainFolder = new BaseFolder(container, 'copy-folder', [
        source,
        target
    ])

    beforeEach(() => mainFolder.reset())

    describe('copyFolder', () => {
        test('copies folder without links', async () => {
//					 	await api.delete(target.url+'.meta')
/*						const links = await api.getItemLinks(target.url, { links: LINKS.INCLUDE })
						if (links.meta) {
							await api._deleteItemWithLinks(links.meta)
						}
*/
            await api.copyFolder(source.url, target.url, { withAcl: false, withMeta: false })
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => {
                const isLink = res[0].endsWith('.meta') || res[0].endsWith('.acl')
                expect(res).toEqual([expect.any(String), !isLink])
            })
        })
        test('copies folder with all links', async () => {
            await api.copyFolder(source.url, target.url)
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => expect(res).toEqual([expect.any(String), true]))
        })
    })

    describe('deleteFolderRecursively', () => {
        test('deletes folder and all links', async () => {
            await api.deleteFolderRecursively(source.url)
            await expect(api.itemExists(source.url)).resolves.toBe(false)
        })
    })

    describe('move', () => {
        test('moves folder with all links', async () => {
            await api.move(source.url, target.url)
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => expect(res).toEqual([expect.any(String), true]))
        })
        test('deletes source completely', async () => {
            await api.move(source.url, target.url)
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => expect(res).toEqual([expect.any(String), true]))
        })
    })

})
