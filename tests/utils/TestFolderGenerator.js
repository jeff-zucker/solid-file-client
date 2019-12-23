import contextSetup from './contextSetup'
import SolidApi from '../../src/SolidApi'
import FileApi from './FileApi'

let _api

/**
 * Return true when the file mock should be used instead of SolidApi
 * @returns {boolean}
 */
const useFileApi = () => contextSetup.getPrefix() === contextSetup.prefixes.file

/**
 * If useFileApi returns true, return a FileApi object, else a SolidApi
 * @returns {SolidApi|FileApi}
 */
const getApi = () => {
  if (useFileApi()) {
    if (!_api) {
      _api = new FileApi(contextSetup.prefixes.file)
    }
  } else {
    if (!_api && !contextSetup.isReady()) {
      throw new Error('Tried to access api before the testing environment has been initialized')
    }
    _api = new SolidApi(contextSetup.getFetch())
  }
  return _api
}

/**
 * @typedef {object} Links
 * @property {boolean|string} acl
 * @property {boolean|string} meta
 */

/**
 * Class for creating test folder and file structures
 * Don't create it directly. Use Folder/File/... instead
 */
class TestFolderGenerator {
  /**
   * Create a new item
   * @param {string} name
   * @param {string} content
   * @param {string} contentType
   * @param {TestFolderGenerator[]} children
   * @param {Links} [links]
   */
  constructor (name, content, contentType, children, links = {}) {
    this.name = name
    this.content = content
    this.contentType = contentType
    this.children = children
    this._links = _makeLinkFiles(name, links, this instanceof Folder)
    this.children.unshift(...Object.values(this._links))
    this.basePath = ''
  }

  /**
   * Delete folder and contents and then generate folder structure
   * @param {object} [options]
   */
  async reset (options = { dryRun: false }) {
    await this.remove(options)
    await this.generate(options)
  }

  /**
   * Delete folder and contents
   * @param {obejct} [options]
   */
  async remove ({ dryRun = false }) {
    if (dryRun) {
      console.log(`would remove ${this.url}`)
      return
    }
    try {
      if (await this._exists()) {
        await (this instanceof Folder ? this._removeFolder() : this._removeFile())
      }
    } catch (e) {
      console.error('Error within TestFolderGenerator.remove')
      console.error(`remove was called with: ${this.url}`)
      if (e && (e.url || (e.headers && e.headers.get))) {
        console.error(`error occurred for: ${e.url || e.headers.get('location')}`)
      }
      console.error(e)
      console.error('Please check the TestFolderGenerator.remove method for errors')
      console.trace()
      throw e
    }
  }

  _removeFolder () {
    return getApi().deleteFolderRecursively(this.url)
  }

  _removeFile () {
    return getApi().delete(this.url)
  }

  _exists () {
    return getApi().itemExists(this.url)
  }

  /**
   * Generate folder structure
   * Will ignore items which already exists
   * @param {object} options
   */
  async generate (options = { dryRun: false }) {
    if (options.dryRun) {
      console.log(`would generate ${this.url}`)
      return Promise.all(this.children.map(child => child.generate(options)))
    }
    try {
      await (this instanceof Folder ? this._generateFolder() : this._generateFile())
    } catch (e) {
      console.error('Error while generating items within TestFolderGenerator.generate')
      console.error(`Couldn't create ${this.url}`)
      if (e && (e.url || (e.headers && e.headers.get))) {
        console.error(`error occurred for: ${e.url || e.headers.get('location')}`)
      }
      console.error(e)
      console.error('Please check the createFolder/createFile method for errors')
      console.trace()
      throw e
    }

    await Promise.all(this.children.map(child => child.generate(options)))
  }

  _generateFolder () {
    return getApi().createFolder(this.url, { createPath: false })
  }

  _generateFile () {
    return getApi().createFile(this.url, this.content, this.contentType)
  }

  /**
   * Loop through all contents of this item (excluding placeholders)
   * @param {function} callback
   */
  traverseContents (callback) {
    if (this instanceof FilePlaceholder || this instanceof FolderPlaceholder) {
      return
    }
    this.children.forEach(child => child.traverse(callback))
  }

  /**
   * Loop through all contents of this item and also trigger the callback for this item (excluding placeholders)
   * @param {function} itemCallback
   */
  traverse (itemCallback) {
    if (this instanceof FilePlaceholder || this instanceof FolderPlaceholder) {
      return
    }
    this.traverseContents(itemCallback)
    itemCallback(this)
  }

  /**
   *
   * @param {string|TestFolderGenerator} base - either url starting with file:// path starting with / or instance of TestFolderGenerator
   */
  setBasePath (base) {
    if (base instanceof TestFolderGenerator) {
      if (base instanceof Folder) {
        // Set the base as parent of this folder
        base = `${base.basePath}${base.name}`
      } else if (base instanceof File) {
        // Put it into the same folder as the other file
        base = base.basePath
      } else {
        throw new Error('Invalid argument for setBasePath', base)
      }
    }

    this.basePath = base
    if (!this.basePath.endsWith('/')) {
      this.basePath = this.basePath + '/'
    }

    this.children.forEach(child => child.setBasePath(this))
  }

  get url () {
    return contextSetup.getBaseUrl() + this.basePath + this.name
  }

  get acl () {
    return this._links.acl
  }

  get meta () {
    return this._links.meta
  }

  /**
   * @returns {TestFolderGenerator[]}
   */
  get contents () {
    const contents = []
    this.traverseContents(item => contents.push(item))
    return contents
  }

  clone () {
    if (this instanceof Folder) {
      return new Folder(this.name, this.children.map(child => child.clone()))
    }
    if (this instanceof FolderPlaceholder) {
      return new FolderPlaceholder(this.name, this.children.map(child => child.clone()))
    }
    if (this instanceof File) {
      return new File(this.name, this.content, this.contentType)
    }
    if (this instanceof FilePlaceholder) {
      return new FilePlaceholder(this.name, this.content, this.contentType)
    }
    throw new Error("Couldn't create clone")
  }

  toString () {
    let str = this.name
    if (this instanceof FolderPlaceholder || this instanceof FilePlaceholder) {
      str = '[' + str + ']'
    }
    if (this.children.length) {
      let contents = this.children.map(child => child.toString()).join('\n')
      contents = contents.split('\n').map(str => '- ' + str).join('\n')
      str += '\n' + contents
    }
    return str
  }
}

class Folder extends TestFolderGenerator {
  /**
   * Create a new Test Folder
   * @param {string} name
   * @param {TestFolderGenerator[]} [children]
   * @param {Links} [links]
   */
  constructor (name, children = [], links) {
    if (!name.endsWith('/')) {
      name = name + '/'
    }
    super(name, '', 'text/turtle', children, links)
  }
}

/**
 * Shortcut to creating a new folder and calling folder.setBasePath(base)
 */
class BaseFolder extends Folder {
  /**
   *
   * @param {string|TestFolderGenerator} base base path for all children
   * @param {TestFolderGenerator[]} [children]
   * @param {Links} [links]
   */
  constructor (base, name, children = [], links) {
    super(name, children, links)
    this.setBasePath(base)
  }
}

class File extends TestFolderGenerator {
  /**
   *
   * @param {string} name
   * @param {string} [content]
   * @param {string} [contentType]
   * @param {Links} [links]
   */
  constructor (name, content = '<> a <#test>.', contentType = 'text/turtle', links) {
    super(name, content, contentType, [], links)
  }
}

/**
 * Creates a placeholder for a folder which will be deleted on generate
 * Use this if you want to make sure a folder doesn't exist
 * Also useful for getting the url of a placeholder nested inside other folders
 */
class FolderPlaceholder extends Folder {
  generate (...args) {
    return this.remove(...args)
  }
}

/**
 * Creates a placeholder for a file which will be deleted on generate
 * Use this if you want to make sure a file doesn't exist
 * Also useful for getting the url of a placeholder nested inside other folders
 */
class FilePlaceholder extends File {
  generate (...args) {
    return this.remove(...args)
  }
}

const getSampleAcl = itemName => `
@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix item: <./${itemName}>.
@prefix c: </profile/card#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo item:;
    n0:agent c:me;
    n0:default item:;
    n0:mode n0:Control, n0:Read, n0:Write.
`
const getSampleMeta = itemName => `<#${itemName}> a <#ho>.`

/**
 * @param {string} name
 * @param {Links} links
 * @param {boolean} isFolder
 * @returns {Object.<string, File>}
 */
function _makeLinkFiles (name, links, isFolder) {
  name = isFolder ? '' : name
  const files = {}

  if (links.acl) {
    const content = typeof links.acl === 'string' ? links.acl : getSampleAcl(name)
    files.acl = new File(`${name}.acl`, content, 'text/turtle')
  }
  if (links.meta) {
    const content = typeof links.meta === 'string' ? links.meta : getSampleMeta(name)
    files.meta = new File(`${name}.meta`, content, 'text/turtle')
  }

  return files
}

export default {
  Folder,
  File,
  BaseFolder,
  FolderPlaceholder,
  FilePlaceholder
}
