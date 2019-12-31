import apiUtils from '../src/utils/apiUtils'

const {
  getParentUrl,
  getItemName,
  areFolders,
  areFiles
} = apiUtils

const host = 'https://example.org/'
const base = host + 'path/to/'

const files = [
  base + 'file.ext',
  base + 'file',
  base + 'file-file'
]
const folders = [
  base + 'folder/',
  base + 'folder-two/'
]

describe('getParentUrl', () => {
  test('getParentUrl returns parent if existing', () => {
    const child = base + 'child/'
    const grandChild = child + 'grand-child/'
    expect(getParentUrl(grandChild)).toBe(child)
    expect(getParentUrl(child)).toBe(base)
  })
  test('getParentUrl does not throw if no parent exists', () => {
    getParentUrl(host)
    getParentUrl('')
    getParentUrl('/')
  })
})

describe('getItemName', () => {
  test('getItemName returns file name', () => {
    const items = [
      'file.ext',
      'file',
      'file-file.ext'
    ]
    items.forEach(name => expect(getItemName(base + name)).toBe(name))
  })
  test('getItemName returns folder name', () => {
    const folders = [
      'folder',
      'folder-folder'
    ]
    folders.forEach(name => expect(getItemName(base + name + '/')).toBe(name))
  })
})

describe('areFolders', () => {
  test('returns true if all arguments are folders', () => expect(areFolders(...folders)).toBe(true))
  test('returns false if some arguments are files', () => expect(areFolders(...folders, files[0])).toBe(false))
  test('returns false if all arguments are files', () => expect(areFolders(...files)).toBe(false))
})

describe('areFiles', () => {
  test('returns true if all arguments are files', () => expect(areFiles(...files)).toBe(true))
  test('returns false if some arguments are folders', () => expect(areFiles(...files, folders[0])).toBe(false))
  test('returns false if all arguments are folders', () => expect(areFiles(...folders)).toBe(false))
})
