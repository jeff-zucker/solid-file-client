// import { getParentUrl, getItemName, areFolders, areFiles, LINK } from './utils/apiUtils'
// import folderUtils from './utils/folderUtils'
import apiUtils from './utils/apiUtils'
import RdfQuery from './utils/rdf-query'

const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
// const { text2graph, processFolder } = folderUtils

/**
 * @typedef {Object} RequestOptions
 * @property {boolean} [overwrite=false]
 */

class SolidAPI {
  /**
   * Provide API methods which use the passed fetch method
   * @param {function(string, Object): Promise<Response>} fetch - (optionally authenticated) fetch method similar to window.fetch
   * @example
   * const auth = require('solid-auth-client').auth
   * const SolidApi = require('solid-auth-api')
   * const api = new SolidApi(auth.fetch.bind(auth))
   * await auth.login(...)
   * api.createFolder('https:/.../foo/bar/')
   *   .then(response => console.log(`Created: ${response.url}`))
   */
  constructor (fetch) {
    this._fetch = fetch
    this._rdf = new RdfQuery(fetch)
  }

  /**
   * Fetch a resource with the passed fetch method
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  fetch (url, options) {
    return this._fetch(url, options)
      .then(this._assertResponseOk)
  }

  /**
   * Send get request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  get (url, options) {
    return this.fetch(url, {
      method: 'GET',
      ...options
    })
  }

  /**
   * Send delete request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  delete (url, options) {
    return this.fetch(url, {
      method: 'DELETE',
      ...options
    })
  }

  /**
   * Send post request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  post (url, options) {
    return this.fetch(url, {
      method: 'POST',
      ...options
    })
  }

  /**
   * Send put request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  put (url, options) {
    return this.fetch(url, {
      method: 'PUT',
      ...options
    })
  }

  /**
   * Send patch request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  patch (url, options) {
    return this.fetch(url, {
      method: 'PATCH',
      ...options
    })
  }

  /**
   * Send head request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  head (url, options) {
    return this.fetch(url, {
      method: 'HEAD',
      ...options
    })
  }

  /**
   * Send options request
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  options (url, options) {
    return this.fetch(url, {
      method: 'OPTIONS',
      ...options
    })
  }

  /**
   * Check if item exists
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  async itemExists (url) {
    return this.head(url)
      .then(() => true)
      .catch(() => false)
  }

  /**
   * Create an item at target name
   * A different name will be chosen if it already exists
   * @param {string} url
   * @param {Blob|string} content
   * @param {string} contentType
   * @param {string} link - link specifies what rdf type it is
   * @returns {Promise<Response>}
   */
  createItem (url, content, contentType, link) {
    const parentUrl = getParentUrl(url)
    const name = getItemName(url)
    const options = {
      headers: {
        link,
        slug: name,
        'Content-Type': contentType
      },
      body: content
    }

    return this.post(parentUrl, options)
  }

  /**
   * Create or overwrite an item
   * @param {string} url
   * @param {Blob|string} content
   * @param {string} contentType
   * @param {string} link - link specifies what rdf type it is
   * @returns {Promise<Response>}
   */
  putItem (url, content, contentType, link) {
    const parentUrl = getParentUrl(url)
    const name = getItemName(url)
    const options = {
      headers: {
        link,
        slug: name,
        'Content-Type': contentType
      },
      body: content
    }

    return this.put(parentUrl, options)
  }

  /**
   * Create a folder if it doesn't exist
   * @param {string} url
   * @returns {Promise<Response>} Response of HEAD request if it already existed, else of creation request
   */
  async createFolder (url) {
    return this.head(url)
      .catch(response => {
        if (response.status !== 404) {
          throw response
        }

        return this.createItem(url, '', 'text/turtle', LINK.CONTAINER)
      })
  }

  /**
   * Create a new file
   * @param {string} url
   * @param {Blob|String} content
   * @returns {Promise<Response>}
   */
  createFile (url, content, contentType) {
    return this.createItem(url, content, contentType, LINK.RESOURCE)
  }

  /**
   * Put a new file to the target destination (overwrites if already existing)
   * @param {string} url
   * @param {Blob|String} content
   * @param {string} contentType
   * @returns {Promise<Response>}
   */
  putFile (url, content, contentType) {
    return this.putItem(url, content, contentType, LINK.RESOURCE)
  }

  /**
   * Fetch and parse a folder
   * @param {string} url
   * @returns {FolderData}
   */
  async readFolder (url) {
    try {
      const res = await this.processFolder(url)
      return {
        ok: true,
        status: 200,
        body: res
      }
    } catch (e) {
      throw (e)
    }
  }

  /**
   * Copy a file
   * Writes to a different name if overwrite option is not set to true
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} - Response from the new file created
   */
  async copyFile (from, to, { overwrite } = { overwrite: false }) {
    const response = await this.get(from)
    const content = await response.blob()

    return overwrite ? this.putFile(to, content) : this.createFile(to, content)
  }

  /**
   * Copy a folder and all its contents
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Resolves with the response from the top level folder created
   */
  async copyFolder (from, to, { overwrite } = { overwrite: false }) {
    const { body: { folders, files } } = await this.readFolder(from).then(this._assertResponseOk)

    const folderResponse = await this.createFolder(to)
    const promises = [
      ...folders.map(({ name }) => this.copyFolder(`${from}${name}/`, `${to}${name}/`, { overwrite })),
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, { overwrite }))
    ]

    return Promise.all(promises)
      .then(folderResponse)
  }

  /**
   * Copy a file (url ending with file name) or folder (url ending with "/")
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Resolves with the response of the creation of the "to" resource
   */
  copy (from, to, options) {
    if (areFolders(from, to)) {
      return this.copyFolder(from, to, options)
    }
    if (areFiles(from, to)) {
      return this.copyFile(from, to, options)
    }

    throw new Error('Cannot copy from a folder url to a file url or vice versa')
  }

  /**
   * Delete all folders and files inside a folder
   * @param {string} url
   * @returns {Promise<Response[]>} Resolves with a response for each deletion request
   */
  async deleteFolderContents (url) {
    const { body: { folders, files } } = await this.readFolder(url).then(this._assertResponseOk)
    const resolvedResponses = []

    await Promise.all([
      ...folders.map(async ({ url: folderUrl }) => resolvedResponses.push(...(await this.deleteFolderRecursively(folderUrl)))),
      ...files.map(async ({ url: fileUrl }) => resolvedResponses.push(await this.delete(fileUrl)))
    ])

    return resolvedResponses
  }

  /**
   * Delete a folder and its contents recursively
   * @param {string} url
   * @returns {Promise<Response>} Response for the top level folder
   */
  async deleteFolderRecursively (url) {
    const resolvedResponses = []
    resolvedResponses.push(...(await this.deleteFolderContents(url)))
    resolvedResponses.unshift(await this.delete(url))

    return resolvedResponses
  }

  /**
   * Move a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for copying and deleting items
   * @param {string} from
   * @param {string} to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Response of the new item created
   */
  async move (from, to, options) {
    const copyResponse = await this.copy(from, to, options)
    await this.delete(from)
    return copyResponse
  }

  /**
   * Rename a file (url ending with file name) or folder (url ending with "/").
   * Shortcut for moving items within the same directory
   * @param {string} url
   * @param {string} newName
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>} Response of the new item created
   */
  rename (url, newName, options) {
    const to = getParentUrl(url) + newName + (areFolders(url) ? '/' : '')
    return this.move(url, to, options)
  }

  /**
   * Throw error if response.ok is set to false
   * @param {Response} response
   * @returns {Reponse} same response
   * @throws {Response}
   */
  _assertResponseOk (response) {
    if (!response.ok) {
      throw response
    }
    return response
  }

  /**
   * processFolder(url)
   *
   * returns the same thing the old solid-file-client did except
   *   a) .acl and .meta files are included in the files array *if they exist*
   *   b) additional fields such as content-type are added if available
   *   c) it no longer returns the turtle representation
   */
  async processFolder (folderUrl) {
    let self = this
    let rdf = this._rdf
    let files = await rdf.query(folderUrl, { thisDoc: '' }, { ldp: 'contains' })
    let folder = await self.getLinks(folderUrl)
    folder[0] = Object.assign(folder[0],
      processStatements(await rdf.query(null, { thisDoc: '' })) || {}
    )
    // if (files.length === 0 && folder.length === 1) {
    //   console.log('folder is empty')
    //   return
    // }
    let folderItems = []
    let fileItems = []
    for (var f in files) {
      let thisFile = files[f].object
      let thisFileWithLinks = await self.getLinks(thisFile.value)
      thisFileWithLinks[0] = Object.assign(thisFileWithLinks[0],
        processStatements(await rdf.query(null, thisFile))
      )
      if (thisFileWithLinks[0].type === 'Container') {
        folderItems = folderItems.concat(thisFileWithLinks)
      } else { fileItems = fileItems.concat(thisFileWithLinks) }
    }
    const fullName = folderUrl.replace(/\/$/, '')
    const name = fullName.replace(/.*\//, '')
    const parent = fullName.substr(0, fullName.lastIndexOf('/')) + '/'
    let returnVal = folder.shift() // the container itself
    fileItems = fileItems.concat(folder) // the .acl etc of the container
    returnVal.type = 'folder' // for backwards compatability :-(
    returnVal.name = name
    returnVal.parent = parent
    returnVal.url = folderUrl
    returnVal.folders = folderItems
    returnVal.files = fileItems
    // returnVal.content,                 // thinking of not sending the turtle
    return returnVal

    function processStatements (stmts) {
      let returnVal = {}
      stmts.forEach(stm => {
        let predicate = stm.predicate.value.replace(/.*\//, '').replace(/.*#/, '')
        if (!predicate.endsWith('type') && !predicate.match('contains')) { returnVal[predicate] = stm.object.value }
      })
      return returnVal
    }
  } // end of processFolder

  /**
   * getLinks(itemUrl)
   *
   * returns an array of records related to an item (resource or container)
   *   0   : the item itself
   *   1-3 : the .acl, .meta, and .meta.acl for the item if they exist
   * each record includes these fields
   *   url
   *   type (one of Container, Resource, AccessControl, or Metadata)
   *   content-type (text/turtle, etc.)
   */
  async getLinks (url) {
    let self = this
    let res = await self.fetch(url, { method: 'HEAD' })
    let link = await res.headers.get('link')
    link = await parseLinkHeader(link, url, url)
    let item = []
    item.push({
      url: url,
      type: link.type,
      'content-type': res.headers.get('content-type')
    })
    if (link.acl) item.push(link.acl)
    if (link.meta) item.push(link.meta)
    if (link.metaAcl) item.push(link.metaAcl)
    return item

    // I Stole this from rdflib and munged it
    async function parseLinkHeader (linkHeader, originalUri, reqNode) {
      if (!linkHeader) { return }

      // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*")))*(,|$)/g
      // const paramexp = /[^()<>@,;:"/[]?={} \t]+=(([^()<>@,;:"/[]?={} \t]+)|("[^"]*"))/g

      // From https://www.dcode.fr/regular-expression-simplificator:
      // const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} t]+=["]))*[,$]/g
      // const paramexp = /[^\\<>@,;:"\/\[\]?={} \t]+=["])/g
      // Original:
      const linkexp = /<[^>]*>\s*(\s*;\s*[^()<>@,;:"/[\]?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g
      // const paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g

      const matches = linkHeader.match(linkexp)
      let final = {}
      for (let i = 0; i < matches.length; i++) {
        let split = matches[i].split('>')
        let href = split[0].substring(1)
        if (matches[i].match(/rel="acl"/)) {
          let acl = urlJoin(href, originalUri)
          try { let aclres = await self.fetch(acl, { method: 'HEAD' }) } catch (e) {}
          if (typeof aclres !== 'undefined' && aclres.ok) {
            final.acl = {
              'url': acl,
              type: 'AccessControl',
              'content-type': aclres.headers.get('content-type')
            }
          }
        }
        if (matches[i].match(/rel="describedBy"/)) {
          let meta = urlJoin(href, originalUri)
          let metares
          try { metares = await self.fetch(meta, { method: 'HEAD' }) } catch (e) {}
          if (typeof metares !== 'undefined' && metares.ok) {
            final.meta = {
              'url': meta,
              type: 'Metadata',
              'content-type': metares.headers.get('content-type')
            }
          }
          if (final.meta) {
            let m = await self.getLinks(final.meta.url)
            if (m.acl) final.metaAcl = m.acl
          }
        }
        if (matches[i].match(/rel="type"/)) {
          final.type = href.match('Resource')
            ? 'Resource' : 'Container'
        }
      }
      return final

      // I Stole this from rdflib
      function urlJoin (given, base) {
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
          alert('Invalid base: ' + base + ' in join with given: ' + given)
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
    } // end of parseLinkHeader
  } // end of getLinks
}

export default SolidAPI
