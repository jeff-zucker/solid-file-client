import SolidFileClient from '../../src/index'
import * as N3 from 'n3'
//const { DataFactory } = N3
const { namedNode, blankNode } = N3.DataFactory

import TestFolderGenerator from './TestFolderGenerator'
import contextSetupModule from './contextSetup'
import errorUtils from '../../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './jestUtils'

const { getAuth, getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator

/** @type {SolidApi} */
let api

const container = new BaseFolder(getTestContainer(), 'rdf')

jest.setTimeout(30 * 1000)

beforeAll(async () => {
  await contextSetup()
//  api = new SolidApi(getFetch())
  api = new SolidFileClient(getAuth())
  await container.reset()
})

const insert = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix : <#>.
@prefix ex: <http://example.com#>.
<> solid:patches <#>;
solid:inserts { <#new0> ex:temp :245. <#new> ex:temp1 :245. }.`

const expected = (url) => `<${url}#new0> <http://example.com#temp> <${url}#245>.
<${url}#new> <http://example.com#temp1> <${url}#245>.\n`

const ttlFile = new File('child-file.ttl', '@prefix : <#>. <> a :test.', 'text/turtle')
const n3File = new File('n3-file.n3', insert, 'text/n3')
const badTtlFile = new File('bad-child-file.ttl', '<> a <test>', 'text/turtle')
const ttlTarget = new File('target.ttl', '', 'text/turtle')
const filePlaceholder = new FilePlaceholder('file-placeholder.ttl', '<> a :test.', 'text/turtle')
const folder = new BaseFolder(container, 'rdf-query', [
    ttlFile,
    badTtlFile,
    n3File,
    new Folder('nested', [
        ttlTarget
    ]),
    filePlaceholder,
])
beforeEach(() => folder.reset())

describe('rdf-query', () => {
    const turtle = (url) => `<${url}#new> a <${url}>.\n`
    const turtle1 = `@prefix : <#>.\n:new a <>.\n`
    const turtle2 = '<#new> a <>.\n'

    test('solidNS to quad 1', () => {
        const s = { thisDoc: ''}
        const p = { acl: 'agent' }
        const o = namedNode('/profile/card#me')
        const g = blankNode('n3-0')
        const quad = api.rdf._solidNsToQuad(ttlFile.url, s, p, o, g)
        //expect(quad).toEqual('')
        expect(quad[0].value).toEqual(ttlFile.url)
        expect(quad[1].value).toEqual('http://www.w3.org/ns/auth/acl#agent')
        expect(quad[2].value).toEqual('/profile/card#me')
        expect(quad[3].value).toEqual('n3-0')
    })
    test('solidNS to quad 2', () => {
        const s = { thisDoc: 'me'}
        const p = { acl: '' }
        const o = 'text'
        const g = null
        const quad = api.rdf._solidNsToQuad(ttlFile.url, s, p, o, g)
        expect(quad[0].value).toEqual(ttlFile.url+'#me')
        expect(quad[1].value).toEqual('http://www.w3.org/ns/auth/acl#')
        expect(quad[2].value).toEqual('text')
        expect(quad[3]).toEqual(null)
    })
    test('solidNS to quad 3', () => {
        api.rdf.setPrefix('URI', 'http://example.com/')
        const s = { thisDoc: 'me'}
        const p = { acl: '' }
        const o = { URI: '' }
        const quad = api.rdf._solidNsToQuad(ttlFile.url, s, p, o)
        expect(quad[0].value).toEqual(ttlFile.url+'#me')
        expect(quad[1].value).toEqual('http://www.w3.org/ns/auth/acl#')
        expect(quad[2].value).toEqual('http://example.com/')
        expect(quad[3]).toEqual(null)
    })
    test('queryTurtle', async () => {
        expect((await api.rdf.queryTurtle('./', '@prefix : <#>. <> a :test.')).length).toEqual(1)
    })
    test('query file with bad ttl', async () => {
      return expect(api.rdf.query(badTtlFile.url)).rejects.toThrowError('on line 1')
    })
    test('query n3 file', async () => {
        return expect((await api.rdf.query(n3File.url)).length).toEqual(4)
    })
    test('query ttl file', async () => {
        return expect((await api.rdf.query(ttlFile.url)).length).toEqual(1)
    })
    test('query ttl file, no match', async () => {
        let res = await api.rdf.query(ttlFile.url, null, { acl: 'default'}, null)
        expect(res.length).toEqual(0)
    })
    test('addQuad to store', async () => {
        let res = await api.rdf.addQuad(ttlFile.url, { thisDoc: '' }, { acl: 'agent' }, '<http://example.com>') //{ foaf: 'Agent'})
        res = await api.rdf.query(ttlFile.url, null, null, null)
        expect(res.length).toEqual(2)
    })
    test('removeMatches from store', async () => {
        let res = await api.rdf.removeMatches(ttlFile.url, { thisDoc: '' }, { acl: 'agent' }) // , { foaf: 'Agent'})
        res = await api.rdf.query(ttlFile.url, null, null, null)
        expect(res.length).toEqual(1)
    })
    test('parse ttl file', async () => {
        await api.rdf.parseUrl(ttlFile.url)
        return expect((await api.rdf.query(ttlFile.url)).length).toEqual(1)
    })
    test('parse ttl', async () => {
        await api.rdf.parse(ttlFile.url, turtle(ttlFile.ttl), { baseIRI: ttlFile.url })
        return expect((await api.rdf.query(ttlFile.url)).length).toEqual(1)
    })
    test('write ttl with no baseIRI', async () => {
        await api.rdf.parse(ttlFile.url, turtle(ttlFile.url), { baseIRI: ttlFile.url })
        let res1 = await api.rdf.write(ttlFile.url)
        return expect(res1).toEqual(turtle(ttlFile.url))
    })
    test('write ttl', async () => {
        let res1 = await api.rdf.write(ttlFile.url, { baseIRI: ttlFile.url })
        return expect(res1).toEqual(turtle2)
    })
    test('writeQuads ttl', async () => {
        let res = await api.rdf.query(ttlFile.url)
        let res1 = await api.rdf.writeQuads(res)
        res1 = api.rdf._makeRelativeUrl(res1, ttlFile.url)
        return expect(res1).toEqual(turtle1)
    })
    test('parse n3', async () => {
        const insert = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix : <#>.
        @prefix ex: <http://example.com#>.
        <> solid:patches <#>;
        solid:inserts { <#new0> ex:temp :245. <#new> ex:temp1 :245. }.`
        await api.rdf.parse(n3File.url, insert, { format: 'text/n3' })
        let res = await api.rdf.query(n3File.url, null, { solid: 'inserts' }, null) // , {"termType": "BlankNode", "value": "n3-0"})
        res = await api.rdf.query(n3File.url, null, null, null, res[0].object)
        expect(await api.rdf.writeQuads(res)).toEqual(expected(n3File.url))
    })
    test('getGraphs', async () => {
        const insert = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
        @prefix : <#>.
        @prefix ex: <http://example.com#>.
        <> solid:patches <./>;
        solid:inserts { <#new0> ex:temp :246. <#new> ex:temp1 :246. }.`
        //let graph = (await api.rdf.parse(n3File.url, insert, { format: 'text/n3' })).getGraphs()
        await api.rdf.parse(n3File.url, insert, { format: 'text/n3' })
        let graph = api.rdf.cache[n3File.url].getGraphs()
        expect(graph.length).toEqual(2)
        expect(graph[0].termType).toEqual('DefaultGraph')
        expect(graph[1].termType).toEqual('BlankNode')
    })
})
