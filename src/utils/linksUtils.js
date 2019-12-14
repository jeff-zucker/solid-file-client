import apiUtils from './apiUtils'

const { getParentUrl, getItemName } = apiUtils

class LinksUtils {
  constructor (fetch) {
    this.fetch = fetch
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
  async getLinks (itemUrl, linkAcl) {
    let itemLinks = []
    let linksUrl = await this.getItemLinks(itemUrl)
    let links = {}
    if (linkAcl) {
      links.acl = await _lookForLink('AccessControl', linksUrl.acl)
      if (links.acl) itemLinks = itemLinks.concat(links.acl)
    }
    if (itemUrl.endsWith('/')) {
      links.meta = await _lookForLink('Metadata', linksUrl.meta)
      if (links.meta) {
        // get .meta.acl link
        if (linkAcl) {
          links.metaAcl = await this.getLinks(links.meta.url, linkAcl)
          if (links.metaAcl[0]) {
            links.meta.links = { acl: links.metaAcl[0].url }
            itemLinks = itemLinks.concat(links.meta)
            itemLinks = itemLinks.concat(links.metaAcl)
          } else { itemLinks = itemLinks.concat(links.meta) }
        } else { itemLinks = itemLinks.concat(links.meta) }
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
  async getItemLinks (itemUrl) {
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
    if (matches[i].match(/rel="acl"/)) {
      final.acl = _urlJoin(href, originalUri)
    }
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

/**
 *  input  : linkHeader from a res.headers.get("link") and the item url
 *           sent by SolidApi.findLinkFiles()
 *
 *  output : an array of strings, one for each link type (acl,meta,etc.)
 *
 * this is lifted from rdflib and truncated a bit
 *
 * note: please leave the formating as-is so it can be easily compared
 *       with the original
 */
function _parseLinkHeader (linkHeader, originalUri) {
  if (!linkHeader) { return }
  // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*")))*(,|$)/g
  // const paramexp = /[^()<>@,;:"/[]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*"))/g

  // From https://www.dcode.fr/regular-expression-simplificator:
  // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} t]+=["]))*[,$]/g
  // const paramexp = /[^\\<>@,;:"\/\[\]?={} \t]+=["])/g
  // Original:
  const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g
  // const paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g

  return linkHeader.match(linkexp)
}

/**
 * joins a path to a base path
 *
 *  .urlJoin(".acl", "https://x.com/" )         -> https://x.com/.acl
 *  .urlJoin("y.ttl.acl","https://x.com/y.ttl") -> https://x.com/y.ttl.acl
 *
 * this is lifted from rdflib
 *
 * note: please leave the formating as-is so it can be easily compared
 *       with the original
 */
function _urlJoin (given, base) {
  var baseColon, baseScheme, baseSingle
  var colon, lastSlash, path
  var baseHash = base.indexOf('#')
  if (baseHash > 0) {
    base = base.slice(0, baseHash)
  }
  if (given.length === 0) {
    return base
  }
  if (given.indexOf('#') === 0) {
    return base + given
  }
  colon = given.indexOf(':')
  if (colon >= 0) {
    return given
  }
  baseColon = base.indexOf(':')
  if (base.length === 0) {
    return given
  }
  if (baseColon < 0) {
  // alert('Invalid base: ' + base + ' in join with given: ' + given)
    return given
  }
  baseScheme = base.slice(0, +baseColon + 1 || 9e9)
  if (given.indexOf('//') === 0) {
    return baseScheme + given
  }
  if (base.indexOf('//', baseColon) === baseColon + 1) {
    baseSingle = base.indexOf('/', baseColon + 3)
    if (baseSingle < 0) {
      if (base.length - baseColon - 3 > 0) {
        return base + '/' + given
      } else {
        return baseScheme + given
      }
    }
  } else {
    baseSingle = base.indexOf('/', baseColon + 1)
    if (baseSingle < 0) {
      if (base.length - baseColon - 1 > 0) {
        return base + '/' + given
      } else {
        return baseScheme + given
      }
    }
  }
  if (given.indexOf('/') === 0) {
    return base.slice(0, baseSingle) + given
  }
  path = base.slice(baseSingle)
  lastSlash = path.lastIndexOf('/')
  if (lastSlash < 0) {
    return baseScheme + given
  }
  if (lastSlash >= 0 && lastSlash < path.length - 1) {
    path = path.slice(0, +lastSlash + 1 || 9e9)
  }
  path += given
  while (path.match(/[^\/]*\/\.\.\//)) {
    path = path.replace(/[^\/]*\/\.\.\//, '')
  }
  path = path.replace(/\.\//g, '')
  path = path.replace(/\/\.$/, '/')
  return base.slice(0, baseSingle) + path
} // end of urlJoin

export default LinksUtils
