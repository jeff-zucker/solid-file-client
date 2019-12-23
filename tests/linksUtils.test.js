import linksUtils from '../src/utils/linksUtils'

const { parseLinkHeader, getLinksFromResponse } = linksUtils

const sampleLinks = [
    {
        title: 'Acl for file',
        url: 'https://example.org/foo/file.txt',
        header: '<file.txt.acl>; rel="acl"',
        links: { acl: 'https://example.org/foo/file.txt.acl' }
    }, {
        title: 'ACL for folder',
        url: 'https://example.org/foo/',
        header: '<./.acl>; rel="acl"',
        links: { acl: 'https://example.org/foo/.acl' }
    }, {
        title: 'Meta and Acl for file',
        url: 'https://example.org/foo/file.txt',
        header: '<file.txt.acl>; rel="acl", <file.txt.meta>; rel="meta",',
        links: {
            acl: 'https://example.org/foo/file.txt.acl',
            meta: 'https://example.org/foo/file.txt.meta'
        }
    }, {
        title: 'Meta (as describedBy) and Acl for file',
        url: 'https://example.org/foo/file.txt',
        header: '<file.txt.acl>; rel="acl", <file.txt.meta>; rel="describedBy",',
        links: {
            acl: 'https://example.org/foo/file.txt.acl',
            meta: 'https://example.org/foo/file.txt.meta'
        }
    }
]

describe('parseLinkHeader', () => {
    sampleLinks.forEach(sample => test(sample.title, () => {
        const parsed = parseLinkHeader(sample.header, sample.url)
        expect(parsed).toEqual(sample.links)
    }))
    test.todo('Add more samples')
})

describe('getLinksFromResponse', () => {
    test('returns {} if response contains no link header', () => {
        const response = {
            headers: { get: () => null }
        }
        const parsed = getLinksFromResponse(response)
        expect(parsed).toEqual({})
    })
    sampleLinks.forEach(sample => test(sample.title, () => {
        const response = {
            headers: { get: key => key === 'link' ? sample.header : null },
            url: sample.url
        }
        const parsedWithUrl = getLinksFromResponse(response, sample.url)
        const parsedWithoutUrl = getLinksFromResponse(response)

        expect(parsedWithUrl).toEqual(sample.links)
        expect(parsedWithoutUrl).toEqual(sample.links)
    }))
})
