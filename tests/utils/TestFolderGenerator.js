const fs = require('fs')
const rimraf = require('rimraf')

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
  constructor(name, content, children) {
    this.name = name
    this.content = content
    this.children = children
  }

  /**
   * Delete folder and contents and then generate folder structure
   * @param {object} [options] 
   */
  async reset(options = { dryRun: false }) {
    await this.remove(options)
    await this.generate(options)
  }

  /**
   * Delete folder and contents
   * @param {obejct} [options] 
   */
  async remove({ dryRun = false }) {
    if (dryRun) {
      console.log(`would remove ${this.path}`)
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => rimraf(this.path, err => err ? reject(err) : resolve()))
  }

  /**
   * Generate folder structure
   * Will ignore items which already exists
   * @param {object} options 
   */
  async generate(options = { dryRun: false }) {
    try {
      await ((this instanceof Folder) ? this._generateFolder(options) : this._generateFile(options))
    }
    catch (err) {
      // Don't throw if the item already exists
      if (err.code !== 'EEXIST') {
        throw err
      }
    }

    await Promise.all(this.children.map(child => child.generate(options)))
  }

  async _generateFolder({ dryRun }) {
    if (dryRun) {
      console.log(`would generate: ${this.path}`)
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => fs.mkdir(this.path, err => err ? reject(err) : resolve()))
  }

  async _generateFile({ dryRun }) {
    if (dryRun) {
      console.log(`would generate: ${this.path}`)
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => fs.writeFile(this.path, this.content, err => err ? reject(err) : resolve()))
  }

  /**
   * 
   * @param {string|TestFolderGenerator} base - either url starting with file:// path starting with / or instance of TestFolderGenerator 
   */
  setBase(base) {
    if (base instanceof TestFolderGenerator) {
      base = base.url
      if (!base) {
        throw new Error('The TestFolderGenerator supplied for setBase must already have a basePath')
      }
    }

    this.basePath = base
    if (!this.basePath.endsWith('/')) {
      this.basePath = this.basePath + '/'
    }

    this.children.forEach(child => child.setBase(this.url))
  }

  get path() {
    let path = this.url
    
    if (path.startsWith('file://')) {
      path = path.substr('file://'.length)
    }
    return path
  }

  get url() {
    if (typeof this.basePath !== 'string') {
      throw new Error("Can't compute path because basePath is not set")
    }
    return this.basePath + this.name
  }
}

class Folder extends TestFolderGenerator {
  /**
   * Create a new Test Folder
   * @param {string} name 
   * @param {TestFolderGenerator[]} [children] 
   */
  constructor(name, children = []) {
    if (!name.endsWith('/')) {
      name = name + '/'
    }
    super(name, '', children)
  }
}

/**
 * Shortcut to creating a new folder and calling folder.setBase(base)
 */
class RootFolder extends Folder {
  /**
   * 
   * @param {string|TestFolderGenerator} base base path for all children
   * @param {TestFolderGenerator[]} [children] 
   */
  constructor(base, name, children = []) {
    super(name, children)
    this.setBase(base)
  }
}

class File extends TestFolderGenerator {
  /**
   * 
   * @param {string} name 
   * @param {string} content 
   * @param {string} [contentType] 
   */
  constructor(name, content = "<> a <#test>.") {
    super(name, content, [])
  }
}

module.exports = {
  Folder,
  File,
  RootFolder,
}