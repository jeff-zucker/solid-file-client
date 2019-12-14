// import debug from 'debug'
import apiUtils from './apiUtils'
import ApiLinks from './linksUtils'
import RdfQuery from './rdf-query'

const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils

const defaultReadOptions = {
  withAcl: true,
}

const defaultSolidApiOptions = {
  enableLogging: true
}

class FolderUtils {

  constructor(fetch, options) {
    options = { defaultSolidApiOptions, ...defaultReadOptions, ...options }
  }


  /**
   * processFolder
   *
   * TBD :
   *   - refactor all of the links=true methods (not ready yet)
   *   - re-examine parseLinkHeader, return its full rdf
   *   - re-examine error checking in full chain
   *   - complete documentation of methods
   *
   * here's the current call stack
   *
   * processFolder
   *   getLinks
   *   rdf.query
   *   _processStatements
   *   _packageFolder
   *
   * returns the same thing the old solid-file-client did except
   *   a) .acl and .meta files are included in the files array *if they exist*
   *   b) additional fields such as content-type are added if available
   *   c) it no longer returns the turtle representation
   *
   * parses a folder's turtle, developing a list of its contents
   * by default, finds associated .acl and .meta
   *
   */
  /**
   * @private // We don't need two public readFolder methods?
   * @param {string} folderUrl
   * @param {object} [options]
   * @returns {Promise<FolderData>}
   */
  async processFolder (folderUrl, options = { withAcl: false }) {
  	// TBD return error
    if (!folderUrl.endsWith('/')) folderUrl = folderUrl + '/'
    let [folder, folderItems, fileItems] = [[], [], []] // eslint-disable-line no-unused-vars
    // For folders always add to fileItems : .meta file and if options.withAcl === true also add .acl linkFile
    let folderLinks = await this.getLinks(folderUrl, { withAcl: true })
    let folderMeta = folderLinks.find(item => item.itemType === 'Metadata') || []
    let linkItems = options.withAcl === true ? folderLinks : folderMeta
    fileItems = fileItems.concat(linkItems)
    let files = await this.rdf.query(folderUrl, { thisDoc: '' }, { ldp: 'contains' })
    for (let f in files) {
      let thisFile = files[f].object
      let thisFileStmts = await this.rdf.query(null, thisFile)
      let itemRecord = _processStatements(thisFile.value, thisFileStmts)
      if (itemRecord.itemType.match('Container')) {
        itemRecord.type = 'folder'
        folderItems = folderItems.concat(itemRecord)
      }else {
        let itemRecordAcl = await this.getLinks(itemRecord.url, { withAcl: true })
        itemRecord.links = itemRecordAcl[0] ? { acl: itemRecordAcl[0].url } : {}
        fileItems = fileItems.concat(itemRecord)
        // add fileLink acl
		if (options.withAcl) {
          itemRecordAcl.links = {}
          fileItems = fileItems.concat(itemRecordAcl)  // allways { withAcl: false} if copyFile withAcl: true
        }

      }
    }
    return _packageFolder(folderUrl, folderLinks, folderItems, fileItems)
  }
}

/*
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
   */
  // TBD: Update type declaration
  // TBD: What type are the items in the stmts array?
  /**
   * @private
   * @param {string} url
   * @param {any[]} stmts
   * @returns {Item}
   */
  function _processStatements (url, stmts) {
    const ianaMediaType = 'http://www.w3.org/ns/iana/media-types/'
    const processed = { url: url }
    stmts.forEach(stm => {
      const predicate = stm.predicate.value.replace(/.*\//, '').replace(/.*#/, '')
      let object = stm.object.value.match(ianaMediaType) ? stm.object.value.replace(ianaMediaType, '') : stm.object.value.replace(/.*\//, '')
      if (!predicate.match('type')) object = object.replace(/.*#/, '')
      else if (object !== "ldp#Resource" && object !== "ldp#Container") {
        processed[predicate] = [ ...(processed[predicate] || []), object.replace('#Resource', '') ]   // keep only contentType and ldp#BasicContainer
      }
    })
    for (const key in processed) {
      if (processed[key].length === 1) processed[key] = processed[key][0]
    }
    if (processed.type === undefined) processed['type'] = 'application/octet-stream'
    processed['itemType'] = processed.type.includes('ldp#BasicContainer')
      ? 'Container'
      : 'Resource'
    processed.name = getItemName(url)
    processed.parent = getParentUrl(url)
    return processed
  }

  // TBD: Remove outdated comments
  /*
   * _packageFolder
   *
   * input  : folder's URL, arrays of folders and files it contains
   * output : the hash expected by the end_user of readFolder
   *          as shown in the existing documentation
   */
  /**
   * @private
   * @param {string} folderUrl
   * @param {Item[]} folderItems
   * @param {Item[]} fileItems
   * @returns {FolderData}
   */
  function _packageFolder (folderUrl, folderLinks, folderItems, fileItems) {
    /*
    const fullName = folderUrl.replace(/\/$/, '')
    const name = fullName.replace(/.*\//, '')
    const parent = fullName.substr(0, fullName.lastIndexOf('/')) + '/'
*/
    /** @type {FolderData} */
    let objectLinks = {}
    if (folderLinks[0]) {
      folderLinks.forEach(item => {
        if ( item.url.endsWith('/.acl')) objectLinks = Object.assign(objectLinks, { acl: item.url })
        else if ( item.url.endsWith('/.meta')) objectLinks = Object.assign(objectLinks, { meta: item.url })
        else if ( item.url.endsWith('/.meta.acl')) objectLinks = Object.assign(objectLinks, { metaAcl: item.url })
      })
    }
    let returnVal = {}
    returnVal.type = 'folder' // for backwards compatability :-(
    returnVal.name = getItemName(folderUrl)
    returnVal.parent = getParentUrl(folderUrl)
    returnVal.url = folderUrl
    returnVal.links = objectLinks
    returnVal.folders = folderItems
    returnVal.files = fileItems
    // returnVal.content,     // thinking of not sending the turtle
    return returnVal
  }

export default FolderUtils
