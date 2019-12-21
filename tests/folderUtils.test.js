import folderUtils from '../src/utils/folderUtils'

const { parseFolderResponse } = folderUtils

describe('parseFolderResponse', () => {
    test('is defined', () => {
        expect(typeof parseFolderResponse === 'function').toBe(true)
    })
    test.todo('add tests. Maybe merge with readFolder tests')
})