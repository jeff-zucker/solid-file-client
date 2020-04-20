import apiUtils from './apiUtils'
import RdfQuery from './rdf-query'

const { getParentUrl, getItemName } = apiUtils

/**
 * Parse the response for a folder into an object containing data about files and folders
 * @param {Response} folderResponse response of a request to a folder url (use Accept: text/turtle)
 * @param {string} [folderUrl] url of the folder
 * @returns {FolderData}
 */
const parseFolderResponse = async (folderResponse, folderUrl = folderResponse.url) => {
  const turtle = await folderResponse.text()

  const rdf = new RdfQuery()
  const quads = await rdf.queryTurtle(folderUrl, turtle, { thisDoc: '' }) // await rdf.query(folderUrl, '<' + folderUrl + '>') //
  const folderRecord = _processStatements(folderUrl, quads) // '<' + folderUrl + '>'
  const files = await rdf.queryTurtle(folderUrl, turtle, { thisDoc: '' }, { ldp: 'contains' })

  const folderItems = []
  const fileItems = []

  await Promise.all(files.map(async ({ object: file }) => {
    const quads = await rdf.query(folderUrl, file)
    const record = _processStatements(file.value, quads)
    if (record.itemType.includes('Container')) {
      record.type = 'folder'
      folderItems.push(record)
    } else {
      fileItems.push(record)
    }
  }))

  return _packageFolder(folderRecord, folderItems, fileItems)
}

/**
 * _processStatements
 *
 * input
 *  - item URL
 *  - statements from the container's turtle with this item as subject
 * finds properties of an item from its predicates and objects
 *  - e.g. predicate = stat#size  object = 4096
 *  - strips off full URLs of predicates and objects
 *  - stores "type" property in types because v0.x of sfc needs type
 * returns an associative array of the item's properties
 * @private
 * @param {string} url
 * @param {N3.Quad[]} stmts
 * @returns {Item}
 */
function _processStatements (url, stmts) {
  const ianaMediaType = 'http://www.w3.org/ns/iana/media-types/'
  const processed = { url: url }
  stmts.forEach(stm => {
    const predicate = stm.predicate.value.replace(/.*\//, '').replace(/.*#/, '')
    let object = stm.object.value.match(ianaMediaType) ? stm.object.value.replace(ianaMediaType, '') : stm.object.value.replace(/.*\//, '')
    if (!predicate.match('type')) object = object.replace(/.*#/, '')
    if (object !== 'ldp#Resource' && object !== 'ldp#Container') {
      processed[predicate] = [...(processed[predicate] || []), object.replace('#Resource', '')] // keep only contentType and ldp#BasicContainer
    }
  })
  for (const key in processed) {
    if (processed[key].length === 1) processed[key] = processed[key][0]
  }
  if (processed.type === undefined) processed.type = 'application/octet-stream'
  processed.itemType = processed.type.includes('ldp#BasicContainer')
    ? 'Container'
    : 'Resource'
  processed.name = getItemName(url)
  processed.parent = getParentUrl(url)
  return processed
}

/*
 * _packageFolder
 *
 * input  : folder's URL, arrays of folders and files it contains
 * output : the hash expected by the end_user of readFolder
 *          as shown in the existing documentation
 */
/**
 * @private
 * @param {string} folderRecord
 * @param {Item[]} folderItems
 * @param {Item[]} fileItems
 * @returns {FolderData}
 */
function _packageFolder (folderRecord, folderItems, fileItems) {
  const returnVal = {}
  returnVal.type = 'folder' // for backwards compatibility :-(
  returnVal.modified = folderRecord.modified
  returnVal.mtime = folderRecord.mtime
  returnVal.size = folderRecord.size
  returnVal.itemType = folderRecord.itemType
  returnVal.name = folderRecord.name // getItemName(folderUrl.url)
  returnVal.parent = folderRecord.parent // getParentUrl(folderUrl.url)
  returnVal.url = folderRecord.url
  returnVal.folders = folderItems
  returnVal.files = fileItems

  return returnVal
}

export default {
  parseFolderResponse
}
