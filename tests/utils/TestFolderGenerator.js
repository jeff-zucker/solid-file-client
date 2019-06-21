const contextSetup = require('./contextSetup')
const { default: SolidApi } = require('../../src/SolidApi')

let _api

/**
 * Return the api for the current active context
 * @returns {SolidApi}
 */
const getApi = () => {
  if (!_api && contextSetup.isReady()) {
    _api = new SolidApi(contextSetup.getFetch())
  }
  if (!_api) {
    throw new Error('Tried to access api before the testing environment has been initialized')
  }
  return _api
}

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
   */
  constructor (name, content, contentType, children) {
    this.name = name
    this.content = content
    this.contentType = contentType
    this.children = children
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
    return getApi().createFolder(this.url)
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

  get contents () {
    const contents = []
    this.traverseContents(item => contents.push(item))
    return contents
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
   */
  constructor (name, children = []) {
    if (!name.endsWith('/')) {
      name = name + '/'
    }
    super(name, '', 'text/turtle', children)
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
   */
  constructor (base, name, children = []) {
    super(name, children)
    this.setBasePath(base)
  }
}

class File extends TestFolderGenerator {
  /**
   *
   * @param {string} name
   * @param {string} [content]
   * @param {string} [contentType]
   */
  constructor (name, content = '<> a <#test>.', contentType = 'text/turtle') {
    super(name, content, contentType, [])
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

module.exports = {
  Folder,
  File,
  BaseFolder,
  FolderPlaceholder,
  FilePlaceholder
}
