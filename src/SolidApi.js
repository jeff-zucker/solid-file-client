// import { getParentUrl, getItemName, areFolders, areFiles, LINK } from './utils/apiUtils'
import folderUtils from './utils/folderUtils';
import apiUtils from './utils/apiUtils'

const { getParentUrl, getItemName, areFolders, areFiles, LINK } = apiUtils
const { text2graph, processFolder } = folderUtils

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
      ...options,
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
      ...options,
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
      ...options,
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
      ...options,
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
      ...options,
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
      ...options,
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
      ...options,
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
        'Content-Type': contentType,
      },
      body: content,
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
        'Content-Type': contentType,
      },
      body: content,
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
    const response = await this.get(url).catch(res => res)
    if(!response.ok) return response
    try {
      const text = await response.text()
      const graph = await text2graph(text, url, 'text/turtle')
      return {
        ok : true,
        status : 200,
        body : processFolder(graph, url, text)
      }
   }
   catch(e){
      throw {
        ok : false,
        status : 500,
        statusText : "failed to parse folder turtle"
      }
   }
  }

  /**
   * Copy a file
   * Writes to a different name if overwrite option is not set to true
   * @param {string} from - Url where the file currently is
   * @param {string} to - Url where it should be copied to
   * @param {RequestOptions} [options]
   * @returns {Promise<Response>}
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
      ...files.map(({ name }) => this.copyFile(`${from}${name}`, `${to}${name}`, { overwrite })),
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
   * @returns {Promise<Response[]>} Resolves with an array of the responses for the deletion of all direct children of the folder
   */
  async deleteFolderContents (url) {
    const { body: { folders, files } } = await this.readFolder(url).then(this._assertResponseOk)

    const promises = [
      ...folders.map(({ url: folderUrl }) => this.deleteFolderRecursively(folderUrl)),
      ...files.map(({ url: fileUrl }) => this.delete(fileUrl)),
    ]
    return Promise.all(promises)
  }

  /**
   * Delete a folder and its contents recursively
   * @param {string} url
   * @returns {Promise<Response>} Response for the top level folder
   */
  async deleteFolderRecursively (url) {
    return this.deleteFolderContents(url)
      .then(() => this.delete(url))
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
  _assertResponseOk(response) {
    if (!response.ok) {
      throw response
    }
    return response
  }
}

export default SolidAPI
