
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

describe('copyLinksForItem', () => {
    describe('copyAclFileForItem', () => {

    })
})