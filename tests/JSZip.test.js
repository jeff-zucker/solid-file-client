import SolidFileClient from '../src/index'
import apiUtils from '../src/utils/apiUtils'
import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import errorUtils from '../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const getRoot = url => apiUtils.getRootUrl(url).substring(0, apiUtils.getRootUrl(url).length - 1)

const { getParentUrl, getItemName } = apiUtils
const { FetchError, assertResponseOk, composedFetch, toFetchError } = errorUtils
const { getAuth, getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator

/** @type {SolidFileClient} */
let fc

const container = new BaseFolder(getTestContainer(), 'JSZip')

jest.setTimeout(30 * 1000)

beforeAll(async () => {
  await contextSetup()
//  api = new SolidApi(getFetch())
  fc = new SolidFileClient(getAuth())
  await container.reset()
})

const recursiveFolderItems = async (url, options) => {
  options = { links: 'include',
    withAcl: true,
    withMeta: true,
    ...options
  }
  let items = [url]
  items = await recursive(url, items, options)
  items = items.map(item => item.replace(getParentUrl(url), ''))
 return items
}

const recursive = async (url, items = [], options) => {
  const itemList = await fc.getFolderItemList(url, options)
  items = items.concat(itemList)
  for (const i in itemList) {
    if (itemList[i].endsWith('/')) {
      items = await recursive(itemList[i], items, options)
    }
  }
  return items
}

const aclDefault = '\n    n0:default <./>;'

const createPseudoAcl = (item, rootUrl = '', folderDefault = '') => `@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: <${rootUrl}/profile/card#>.

:ReadWriteControl
    a n0:Authorization;
    n0:accessTo <${item}>;
    n0:agent c:me;
    n0:agentClass n1:Agent;${folderDefault}
    n0:mode n0:Read, n0:Write, n0:Control.
`
    const expectedPseudoAcl = (itemName, folderDefault = '') => `@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix c: </profile/card#>.

:ReadWriteControl
    a n0:Authorization;
    n0:accessTo <${itemName}>;
    n0:agent c:me;
    n0:agentClass n1:Agent;${folderDefault}
    n0:mode n0:Read, n0:Write, n0:Control.
`


const childFile = new File('child-file.txt', 'I am a child', 'text/plain', { acl: true, placeholder: { meta: true } })
const otherChildFile = new File('other-child-file.txt', 'I am another child', 'text/plain', { placeholder: { acl: true } })
const filePlaceholder = new FilePlaceholder('file-placeholder.zip', 'file with placeholder', 'application/zip', {
    placeholder: {
        acl: true,
        meta: false
    }
})
const otherFilePlaceholder = new FilePlaceholder('other-file-placeholder.zip', 'file with placeholder', 'application/zip', {
  placeholder: {
      acl: true,
      meta: false
  }
})
const nestedFolder = new Folder('nestedMeta', [], { meta: true })
const nestedChildFile = new File('nested-child-file.txt', 'I am a child', 'text/plain', { acl: true, placeholder: { meta: true } })
const nestedFolderAcl = new Folder('nestedAcl', [nestedChildFile], { acl: true })
const otherNestedFolderAcl = new Folder('otherNestedAcl', [], { acl: true })

// jest do not allow async blob, it uses JSZip string
describe('createZip', () => {
  const folder = new BaseFolder(container, 'createZip', [
    childFile,
    otherChildFile,
    nestedFolder,
    nestedFolderAcl,
    otherNestedFolderAcl,
    ], { meta: true },
    filePlaceholder
  )
  beforeEach(() => folder.reset())

  describe('createZipArchive', () => {
      // zip/unzip uses blob or string when blob is not supported (jest test do not support blob)
      test('zip support', () => {
        expect(fc.zipSupport().string || fc.zipSupport().blob).toBeTruthy()
      })
      test('zip file : destination must end with .zip', async () => {
        return expect(fc.createZipArchive(childFile.url, otherChildFile.url)).rejects.toThrow('file must end with \".zip\"')
      })
      test('zip file : links = include_possible is not allowed', async () => {
          return expect(fc.createZipArchive(childFile.url, filePlaceholder.url, { links: 'include_possible' })).rejects.toThrow('option : \"include_possible\", is not allowed')
      })
      test('getFileBlob', async () => {
          const blob = await fc.getFileBlob(childFile.url)
          expect(blob.type).toContain('text/plain') // ; charset=utf-8')
      })
      test('zip file with acl', async () => {
        const res = await fc.createZipArchive(childFile.url, filePlaceholder.url)
        await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)

      })
        })

  describe('getAsZip (test=true)', () => {
    test('getAsZip file without acl', async () => {
        const zip = await fc.getAsZip(childFile.url, { withAcl: false })
        await expect(zip.files[getItemName(childFile.url)].name).toBe(getItemName(childFile.url))
        await expect(zip.files[getItemName(childFile.acl.url)]).toBe(undefined)
    })
    test('getAsZip file with acl', async () => {
        const zip = await fc.getAsZip(childFile.url)
        await expect(zip.files[getItemName(childFile.url)].name).toBe(getItemName(childFile.url))
        await expect(zip.files[getItemName(childFile.acl.url)].name).toBe(getItemName(childFile.acl.url))
    })
    test('getAsZip folder links=exclude', async () => {
        await expect(fc.itemExists(folder.meta.url)).resolves.toBe(true)
        const expected = await recursiveFolderItems(folder.url, { links: 'exclude' })
        const zip = await fc.getAsZip(folder.url, { links: 'exclude' })
        // const res = Object.keys(zip.files)
        for (const i in expected) {
          await expect(zip.files[expected[i]].name).toEqual(expected[i])
          if (!zip.files[expected[i]].dir) {
            const content = await fc.readFile(getParentUrl(folder.url) + expected[i])
            await expect(zip.files[expected[i]]._data).resolves.toEqual(content)
          }
        }
    })
    test('getAsZip folder withAcl=false', async () => {
        await expect(fc.itemExists(folder.meta.url)).resolves.toBe(true)
        await expect(fc.itemExists(nestedFolder.meta.url)).resolves.toBe(true)
        const expected = await recursiveFolderItems(folder.url, { withAcl: false })
        const zip = await fc.getAsZip(folder.url, { withAcl: false })
        // const res = Object.keys(zip.files)
        for (const i in expected) {
          await expect(zip.files[expected[i]].name).toEqual(expected[i])
          if (!zip.files[expected[i]].dir) {
            const content = await fc.readFile(getParentUrl(folder.url) + expected[i])
            if (content !== '') await expect(zip.files[expected[i]]._data).resolves.toEqual(content)
          }
        }
    })
    test('getAsZip folder with meta and acl', async () => {
        const zip = await fc.getAsZip(folder.url)
        const expected = await recursiveFolderItems(folder.url)
        // const res = Object.keys(zip.files)
        for (const i in expected) {
          await expect(zip.files[expected[i]].name).toEqual(expected[i])
          if (!zip.files[expected[i]].dir) {
            const content = await fc.readFile(getParentUrl(folder.url) + expected[i])
            if (content !== '') await expect(zip.files[expected[i]]._data).resolves.toEqual(content)
          }
        }
    })
  })

  describe('getAsZip make acl relative', () => {
    beforeEach(async () => {
      // relative to POD
      // absolute
      const fileAcl = createPseudoAcl(childFile.url.replace(getRoot(childFile.url), ''), getRoot(childFile.url))
      await fc.putFile(childFile.acl.url, fileAcl, 'text/turtle')
      const folderAcl = createPseudoAcl(otherNestedFolderAcl.url, getRoot(otherNestedFolderAcl.url), aclDefault)
      await fc.putFile(otherNestedFolderAcl.acl.url, folderAcl, 'text/turtle')
    })
    test('itemLinkContent() : fileWithAcl', async () => {
      const fileAcl = createPseudoAcl(childFile.url.replace(getRoot(childFile.url), ''), getRoot(childFile.url))
      expect(await fc.readFile(childFile.acl.url)).toEqual(fileAcl)
      const { content } = await fc.itemLinkContent(childFile.acl.url, childFile.url)
      expect(content).toEqual(createPseudoAcl('./'+getItemName(childFile.url), ''))
    })
    test('getAsZip() : fileWithAcl (test=true)', async () => {
      const fileAcl = createPseudoAcl(childFile.url.replace(getRoot(childFile.url), ''), getRoot(childFile.url))
      expect(await fc.readFile(childFile.acl.url)).toEqual(fileAcl)
      const zip = await fc.getAsZip(childFile.url)
      await expect(zip.files[getItemName(childFile.acl.url)]._data).resolves.toEqual(createPseudoAcl('./'+getItemName(childFile.url), ''))
    })
    test('itemLinkContent() : folderWithAcl', async () => {
      const folderAcl = createPseudoAcl(otherNestedFolderAcl.url, getRoot(otherNestedFolderAcl.url), aclDefault)
      expect(await fc.readFile(otherNestedFolderAcl.acl.url)).toEqual(folderAcl)
      const { content } = await fc.itemLinkContent(otherNestedFolderAcl.acl.url, otherNestedFolderAcl.url)
      expect(content).toEqual(createPseudoAcl('./', '', aclDefault))
    })
    test('getAsZip() : folderWithAcl (test=true)', async () => {
      const folderAcl = createPseudoAcl(otherNestedFolderAcl.url, getRoot(otherNestedFolderAcl.url), aclDefault)
      expect(await fc.readFile(otherNestedFolderAcl.acl.url)).toEqual(folderAcl)
      const zip = await fc.getAsZip(otherNestedFolderAcl.url)
      await expect(zip.files[getItemName(otherNestedFolderAcl.url)+'/.acl']._data).resolves.toEqual(createPseudoAcl('./', '', aclDefault))
    })
  })
})

describe('extractZipArchive', () => {

  describe('uploadZipArchive', () => {
    test('file with acl (test=true for content)', async () => {
        await expect(fc.itemExists(childFile.acl.url)).resolves.toBe(true)
        const zip = await fc.getAsZip(childFile.url)
        const res = Object.keys(zip.files)
        await expect(res.length).toEqual(2)
        const result = await fc.uploadExtractedZipArchive(zip, nestedFolder.url, '', [])
        const results = fc.flattenObj(result, 'link')
        const itemAclName = getItemName(childFile.acl.url)
        expect(results.err).toEqual([])
        expect(results.info).toEqual([])
        expect(fc.itemExists(nestedFolder.url + itemAclName)).resolves.toBe(true)
        await expect(fc.get(nestedFolder.url + itemAclName).then(res => res.text())).resolves.toEqual(expectedPseudoAcl('./child-file.txt'))
    })
  })

  describe('extractZipArchive (test=true)', () => {
    test('extract zip : file with acl, links=exclude', async () => {
      // check files
      await expect(fc.itemExists(childFile.acl.url)).resolves.toBe(true)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.url))).toBe(false)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(false)
      // create zip
      const res = await fc.createZipArchive(childFile.url, filePlaceholder.url)
      await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)
      // extract zip file to destination folder
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, { links: 'exclude' })
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.url))).toBe(true)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(false)
    })
    test('extract zip : file with acl, withAcl=false', async () => {
      // check files
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(false)
      // create zip
      const res = await fc.createZipArchive(childFile.url, filePlaceholder.url)
      await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)
      // extract zip file to destination folder
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, { withAcl: false })
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.url))).toBe(true)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(false)
    })
    test('extract zip : file with acl', async () => {
      // check files
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(false)
      // create zip
      const res = await fc.createZipArchive(childFile.url, filePlaceholder.url)
      await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)
      // extract zip file to destination folder
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.url))).toBe(true)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(childFile.acl.url))).toBe(true)
    })
    test('extract zip : folder, merge=keep_source', async () => {
      // check file and folder
      await expect(fc.itemExists(childFile.acl.url)).resolves.toBe(true)
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(nestedFolder.url))).toBe(false)
      // zip folder and folder contents
      const res = await fc.createZipArchive(nestedFolder.url, filePlaceholder.url)
      const zip = await fc.readFile(filePlaceholder.url)
      await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)
      // extract zip to destination folder
      const options = { merge: 'keep_source' }
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, options)
      expect(result.err).toEqual([])
      expect(result.info).toEqual([])
      const destFolder = nestedFolderAcl.url+getItemName(nestedFolder.url)+'/'
      expect(await fc.itemExists(destFolder)).toBe(true)
      const source = await recursiveFolderItems(nestedFolder.url)
      const expected = await recursiveFolderItems(destFolder)
      expect(expected).toEqual(source)
    })
    test('extract zip : folder, merge=replace links=exclude', async () => {
      // check file and folder
      await expect(fc.itemExists(childFile.acl.url)).resolves.toBe(true)
      // expect(await fc.itemExists(nestedFolderAcl.url+getItemName(nestedFolder.url))).toBe(false)
      // zip folder and folder contents
      const res = await fc.createZipArchive(nestedFolder.url, filePlaceholder.url)
      const zip = await fc.readFile(filePlaceholder.url)
      await expect(fc.itemExists(filePlaceholder.url)).resolves.toBe(true)
      // extract zip to destination folder
      const options = { merge: 'replace', links: 'exclude'}
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, options)
      expect(result.err).toEqual([])
      expect(result.info).toEqual([])
      // check no .acl or .meta
      const destFolder = nestedFolderAcl.url+getItemName(nestedFolder.url)+'/'
      expect(await fc.itemExists(destFolder)).toBe(true)
      const source = await recursiveFolderItems(nestedFolder.url, { links: 'exclude' })
      // https recreates void .meta automatically
      const expected = await recursiveFolderItems(destFolder, { withMeta: false })
      expect(expected).toEqual(source)
      const destItems = await recursiveFolderItems(destFolder, { withMeta: false })
      expect(destItems.find(item => (item.endsWith('.acl') || item.endsWith('.meta')))).toBeFalsy()
    })
  })

  describe('extract zip archive (invalid acl not created)', () => {
    test('extract zip : file', async () => {
      // check files
      const folderAcl = createPseudoAcl('./', '', aclDefault)
      await fc.putFile(nestedFolderAcl.acl.url, folderAcl, 'text/turtle')
      const fileAcl = createPseudoAcl('./nested-child-file.txt', '')
      await fc.putFile(nestedChildFile.acl.url, fileAcl, 'text/turtle')
      // create zip
      const res = await fc.createZipArchive(nestedChildFile.url, filePlaceholder.url)
      // clean destination
      await fc.deleteFile(nestedChildFile.url)
      // extract return acl error and check acl not created
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, { URI: 'https://test' })
      expect(result.err[0]).toMatch('no agent with Control')
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(nestedChildFile.acl.url))).toBe(false)
    })

    test('extract zip : folder', async () => {
      // check files
      const folderAcl = createPseudoAcl('./', '', aclDefault)
      await fc.putFile(nestedFolderAcl.acl.url, folderAcl, 'text/turtle')
      // create zip
      const res = await fc.createZipArchive(nestedFolderAcl.url, filePlaceholder.url)
      // clean destination
      try {
        await fc.deleteFolder(nestedFolderAcl.url)
      }catch(e){}
      // extract return acl error and check acl not created
      const result = await fc.extractZipArchive(filePlaceholder.url, nestedFolderAcl.url, { URI: 'https://test' })
      expect(result.err[0]).toMatch('no agent with Control')
      expect(await fc.itemExists(nestedFolderAcl.url+getItemName(nestedChildFile.acl.url))).toBe(false)
    })

  })


})
