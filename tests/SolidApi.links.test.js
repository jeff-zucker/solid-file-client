
import SolidApi, { LINKS } from '../src/SolidApi'
import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import errorUtils from '../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const { getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator

/** @type {SolidApi} */
let api

const container = new BaseFolder(getTestContainer(), 'SolidApi-links')

jest.setTimeout(20 * 1000)

beforeAll(async () => {
  await contextSetup()
  api = new SolidApi(getFetch())
  await container.reset()
})

describe('getItemLinks', () => {
    const childFile = new File('child-file.txt', 'I am a child', 'text/plain', { acl: true, placeholder: { meta: true } })
    const otherChildFile = new File('other-child-file.txt', 'I am another child', 'text/plain', { meta: true, placeholder: { acl: true } })

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
        expect(links).toHaveProperty('meta', otherChildFile.meta.url)
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
    const createPseudoAcl = (itemUrl, itemName) => `
        accessTo <${itemUrl}>
        accessTo <./${itemName}>
        agent </profile/card#me>
        default <./>
    `
    const expectedPseudoAcl = newItemName => `
        accessTo <./${newItemName}>
        accessTo <./${newItemName}>
        agent </profile/card#me>
        default <./>
    `
    const fileWithAcl = new File('child-file.txt', 'I am a child', 'text/plain', {
        acl: true, // Note: Content will be overriden by some tests
        placeholder: { meta: true }
    })
    const fileWithMeta = new File('target.txt', undefined, undefined, {
        meta: true,
        placeholder: { acl: true }
    })
    const fileWithLinks = new File('file-with-links.txt', undefined, undefined, {
        meta: new File('file-with-links.txt.meta', undefined, undefined, {
            acl: true
        }),
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
    const filePlaceholder = new FilePlaceholder('file-placeholder.txt', undefined, undefined, {
        placeholder: {
            acl: true,
            meta: new FilePlaceholder('file-placeholder.txt.meta', undefined, undefined, {
                placeholder: { acl: true }
            })
        }
    })
    const folderPlaceholder = new FolderPlaceholder('folder-placholder', [], {
        placeholder: { acl: true, meta: true }
    })

    const folder = new BaseFolder(container, 'copying-links', [
        fileWithAcl,
        folderWithAcl,
        folderWithMeta,
        new Folder('nested', [
            fileWithMeta
        ]),
        fileWithLinks,
        filePlaceholder,
        folderPlaceholder
    ])

    beforeEach(() => folder.reset())

    describe('copyAclFileForItem', () => {
        test('copies acl file of a file to new location', async () => {
            await api.copyAclFileForItem(fileWithAcl.url, fileWithMeta.url)
            await expect(api.itemExists(fileWithMeta.acl.url)).resolves.toBe(true)
        })
        test('modify paths in acl file of a file to match new location ', async () => {
            fileWithAcl.acl.content = createPseudoAcl(fileWithAcl.url, fileWithAcl.name)
            const expectedAcl = expectedPseudoAcl(fileWithMeta.name)
            await fileWithAcl.acl.reset()
            await api.copyAclFileForItem(fileWithAcl.url, fileWithMeta.url)
            await expect(api.get(fileWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('modify paths in acl file of a folder to new location', async () => {
            folderWithAcl.acl.content = createPseudoAcl(folderWithAcl.url, '')
            const expectedAcl = expectedPseudoAcl('')
            await folderWithAcl.acl.reset()
            await api.copyAclFileForItem(folderWithAcl.url, folderWithMeta.url)
            await expect(api.get(folderWithMeta.acl.url).then(res => res.text())).resolves.toEqual(expectedAcl)
        })
        test('responds with put response', async () => {
            const res = await api.copyAclFileForItem(fileWithAcl.url, fileWithMeta.url)
            expect(res).toHaveProperty('status', 201)
            expect(res).toHaveProperty('url', fileWithMeta.acl.url)
        })
        test('fails with 404 if source acl does not exist', () => {
            return rejectsWithStatus(api.copyAclFileForItem(fileWithMeta.url, fileWithAcl.url), 404)
        })
    })

    describe('copyMetaFileForItem', () => {
        test('copies meta file of a file to new location', async () => {
            await api.copyMetaFileForItem(fileWithMeta.url, fileWithAcl.url)
            await expect(api.get(fileWithAcl.meta.url).then(res => res.text())).resolves.toEqual(fileWithMeta.meta.content)
        })
        test('copies meta file of a folder to new location', async () => {
            await api.copyMetaFileForItem(folderWithMeta.url, folderWithAcl.url)
            await expect(api.get(folderWithAcl.meta.url).then(res => res.text())).resolves.toEqual(folderWithMeta.meta.content)
        })
        test('responds with put response', async () => {
            const res = await api.copyAclFileForItem(fileWithAcl.url, fileWithMeta.url)
            expect(res).toHaveProperty('status', 201)
            expect(res).toHaveProperty('url', fileWithMeta.acl.url)
        })
        test('fails with 404 if source meta does not exist', () => {
            return rejectsWithStatus(api.copyMetaFileForItem(fileWithAcl.url, fileWithMeta.url), 404)
        })
    })

    describe('copyLinksForItem', () => {
        const optionsAll = {
            withAcl: true,
            withMeta: true
        }

        test('copies acl if existing', async () => {
            await api.copyLinksForItem(fileWithAcl.url, fileWithMeta.url, optionsAll)
            await expect(api.itemExists(fileWithMeta.acl.url)).resolves.toBe(true)
        })
        test('copies meta if existing', async () => {
            await api.copyLinksForItem(fileWithMeta.url, fileWithAcl.url, optionsAll)
            await expect(api.itemExists(fileWithAcl.meta.url)).resolves.toBe(true)
        })
        test('does not fail with 404 if no link exists', () => {
            return expect(api.copyLinksForItem(folder.url, folderWithAcl.url, optionsAll)).resolves.toBe()
        })
        test('does not copy if options={}', async () => {
            await api.copyLinksForItem(fileWithAcl.url, fileWithMeta.url, {})
            await expect(api.itemExists(fileWithMeta.acl.url)).resolves.toBe(false)
        })
    })

    describe('copyFile', () => {
        test('also copies acl, meta and meta.acl if existing', async () => {
            await api.copyFile(fileWithLinks.url, filePlaceholder.url)
            await expect(api.itemExists(filePlaceholder.acl.url)).resolves.toBe(true)
            await expect(api.itemExists(filePlaceholder.meta.url)).resolves.toBe(true)
            await expect(api.itemExists(filePlaceholder.meta.acl.url)).resolves.toBe(true)
        })
        test('copies no links if withMeta=false and withAcl=false', async () => {
            await api.copyFile(fileWithLinks.url, filePlaceholder.url, { withAcl: false, withMeta: false })
            await expect(api.itemExists(filePlaceholder.acl.url)).resolves.toBe(false)
            await expect(api.itemExists(filePlaceholder.meta.url)).resolves.toBe(false)
            await expect(api.itemExists(filePlaceholder.meta.acl.url)).resolves.toBe(false)
        })
    })

    describe('_deleteItemWithLinks', () => {
        test('deletes meta, meta.acl and acl of file', async () => {
            await api._deleteItemWithLinks(fileWithLinks.url)
            await expect(api.itemExists(fileWithLinks.url)).resolves.toBe(false)
            await expect(api.itemExists(fileWithLinks.acl.url)).resolves.toBe(false)
            await expect(api.itemExists(fileWithLinks.meta.url)).resolves.toBe(false)
            await expect(api.itemExists(fileWithLinks.meta.acl.url)).resolves.toBe(false)
        })
    })
})

describe('recursive', () => {
    const contents = [
        new File('file-with-links.txt', undefined, undefined, {
            acl: true,
            meta: new File('file-with-links.txt.meta', undefined, undefined, { acl: true })
        }),
        new File('file-with-acl.txt', undefined, undefined, { acl: true }),
        new Folder('nested', [
            new File('nested-file.txt')
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
        test('copies folder with all links', async () => {
            await api.copyFolder(source.url, target.url)
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => expect(res).toEqual([expect.any(String), true]))
        })
        test('copies folder without links', async () => {
            await api.copyFolder(source.url, target.url, { withAcl: false, withMeta: false })
            const results = await Promise.all(target.contentsAndPlaceholders
                .map(({ url }) => api.itemExists(url).then(exists => [url, exists])))
            results.forEach(res => {
                const isLink = res[0].endsWith('.meta') || res[0].endsWith('.acl')
                expect(res).toEqual([expect.any(String), !isLink])
            })
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