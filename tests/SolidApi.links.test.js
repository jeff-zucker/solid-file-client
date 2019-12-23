
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

const getAclUrl = itemUrl => `${itemUrl}.acl`
const getMetaUrl = itemUrl => `${itemUrl}.meta`

beforeAll(async () => {
  await contextSetup()
  api = new SolidApi(getFetch())
  await container.reset()
})

// Acl from NSS private folder
const getSampleAcl = itemName => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix item: <./${itemName}>.
@prefix c: </profile/card#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo item:;
    n0:agent c:me;
    n0:default item:;
    n0:mode n0:Control, n0:Read, n0:Write.
`
const createFileAcl = file => new File(`${file.name}.acl`, getSampleAcl(file.name))
const createFolderAcl = () => new File('.acl', getSampleAcl(''))

// Simple meta file
const getSampleMeta = itemName => `<#${itemName}> a <#ho>.`
const createFileMeta = file => new File(`${file.name}.meta`, getSampleMeta(file.name))
const createFolderMeta = () => new File('.meta', getSampleMeta(''))

describe('getItemLinks', () => {
    const childFile = new File('child-file.txt', 'I am a child')
    const otherChildFile = new File('other-child-file.txt', 'I am another child')
    const childAcl = createFileAcl(childFile)
    const otherChildMeta = createFileMeta(otherChildFile)
    const folderAcl = createFolderAcl()

    const folder = new BaseFolder(container, 'getItemLinks', [
        childFile,
        childAcl,
        otherChildFile,
        otherChildMeta,
        folderAcl
    ])

    beforeAll(() => folder.reset())

    test('returns possible acl and meta links for a file without any options', async () => {
        const links = await api.getItemLinks(childFile.url)
        expect(links).toHaveProperty('acl', getAclUrl(childFile.url))
        expect(links).toHaveProperty('meta', getMetaUrl(childFile.url))
    })
    test('returns possible acl and meta links for a folder without any options', async () => {
        const links = await api.getItemLinks(folder.url)
        expect(links).toHaveProperty('acl', getAclUrl(folder.url))
        expect(links).toHaveProperty('meta', getMetaUrl(folder.url))
    })
    test('returns existing acl and meta links for a file with links=INCLUDE', async () => {
        const links = await api.getItemLinks(otherChildFile.url, { links: LINKS.INCLUDE })
        expect(links).not.toHaveProperty('acl')
        expect(links).toHaveProperty('meta', getMetaUrl(otherChildFile.url))
    })
    test('returns existing acl and meta links for a folder with links=INCLUDE', async () => {
        const links = await api.getItemLinks(folder.url, { links: LINKS.INCLUDE })
        expect(links).toHaveProperty('acl', getAclUrl(folder.url))
        expect(links).not.toHaveProperty('meta')
    })
    test('throws if links=EXCLUDE', () => {
        return expect(api.getItemLinks(folder.url, { links: LINKS.EXCLUDE })).rejects.toThrow(/Invalid option/)
    })
})