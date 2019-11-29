import folderUtils from './utils/folderUtils'
import apiUtils from './utils/apiUtils'

const { _parseLinkHeader, _urlJoin } = folderUtils
const { getParentUrl, getItemName } = apiUtils

class apiLinks {

  constructor() {}
}

  /**
   * @private // For now
   * getLinks (TBD)
   *
   * returns an array of records related to an item (resource or container)
   *   0-2 : the .acl, .meta, and .meta.acl for the item if they exist
   * each record includes these fields (see _getLinkObject)
   *   url
   *   type (contentType)
   *   itemType ((AccessControl, or Metadata))
   *   name
   *   parent
   */
  async function getLinks (itemUrl, linkAcl) {
    let itemLinks = []
	let linksUrl = await getItemLinks(itemUrl)
	let links = {}
	if (linkAcl) {
		links.acl = await _lookForLink('AccessControl', linksUrl.acl) 
		if (links.acl) itemLinks = itemLinks.concat(links.acl)
	}
	if (itemUrl.endsWith('/')) {
		links.meta = await _lookForLink('Metadata', linksUrl.meta)
		if (links.meta) {
			itemLinks = itemLinks.concat(links.meta)
			// get .meta.acl link
			if (linkAcl) {
			    links.metaAcl = await getLinks(links.meta.url, linkAcl)
			    if (links.metaAcl) itemLinks = itemLinks.concat(links.metaAcl)
			}
	    }
	}
    return itemLinks
  }

  /**
   * @private
   * getItemLinks (TBD)
   * return allways an object of linkUrls
   * - object.acl for folder and files
   * - object.meta for folder
   *
   */
  async function getItemLinks (itemUrl) {
	// don't getLinks for .acl files
	if (itemUrl.endsWith('.acl')) return []
    let res = await this.fetch(itemUrl, { method: 'HEAD' })
    let linkHeader = await res.headers.get('link')
	// linkHeader is null for index.html ??
    if (linkHeader === null) return []
    // get .meta, .acl links
	let linksUrl = await _findLinksInHeader(itemUrl, linkHeader)
	return linksUrl
  }
  
  /**
   * @private
   * findLinksInHeader (TBD)
   *
   */
  async function _findLinksInHeader (originalUri, linkHeader) {
	let matches = _parseLinkHeader(linkHeader, originalUri)
    let final = {}
    for (let i = 0; i < matches.length; i++) {
      let split = matches[i].split('>')
      let href = split[0].substring(1)
      let linkUrl = ''
      if (matches[i].match(/rel="acl"/)) { 
        final.acl = _urlJoin(href, originalUri) }
      // .meta only for folders
      if (originalUri.endsWith('/') && matches[i].match(/rel="describedBy"/)) {
        final.meta = _urlJoin(href, originalUri)
      }
    }
    return final
  }

  /**
   * @private
   * _lookForLink (TBD)
   *
   * - input
   *     - linkType = one of AccessControl or Metatdata
   *     - itemUrl  = address of the item associated with the link
   *     - relative URL from the link's associated item's header (e.g. .acl)
   * - creates an absolute Url for the link
   * - looks for the link and, if found, returns a link object
   * - else returns undefined
   */
  async function _lookForLink (linkType, linkUrl) {
    try {
      let res = await this.fetch(linkUrl, { method: 'HEAD' })
      if (typeof res !== 'undefined' && res.ok) {
        let contentType = res.headers.get('content-type')
      return _getLinkObject(linkUrl, linkType, contentType)
      }
    } catch (e) {} // ignore if not found
  }

  /**
   * @private
   * _getLinkObject (TBD)
   *
   * creates a link object for a container or any item it holds
   * type is one of AccessControl, Metatdata
   * content-type is from the link's header
   * @param {string} linkUrl
   * @param {string} contentType
   * @param {"AccessControl"|"Metadata"} linkType
   * @returns {LinkObject}
   */
  function _getLinkObject (linkUrl, linkType, contentType) {
    return {
      url: linkUrl,
      type: contentType,
      itemType: linkType,
      name: getItemName(linkUrl),
      parent: getParentUrl(linkUrl)
    }
  }

export default {
	getLinks,
	getItemLinks
}

