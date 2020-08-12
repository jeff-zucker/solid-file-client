//import SolidFileClient from '../../src/index'
//import contextSetupModule from './contextSetup'

//const { getAuth, getFetch, getTestContainer, contextSetup } = contextSetupModule

// contextSetup()
//let api = new SolidFileClient(getAuth())


class Zip {
    constructor (zip, api) {
        this.api = api
        this.zip = zip
    }

    file (fileName, content) {
        this.zip.files[filename] = {
            name: fileName,
            _data: content
        }
    }

    folder (fileName) {
        this.zip.files[fileName] = {
            name: fileName
        }
    }

    generateAsync () {
        return this.zip
    }

    loadAsync (blob) {
        return blob
    }

    async createZipArchive (path, archiveUrl, options) {
        options = {
          links: SolidFileClient.LINKS.INCLUDE,
          withAcl: true,
          withMeta: true,
          agent: 'to_target',
          createPath: true,
          ...options
        }
        if (options.links === SolidFileClient.LINKS.INCLUDE_POSSIBLE) {
          throw toFetchError(new Error(`option : "${SolidFileClient.LINKS.INCLUDE_POSSIBLE}", is not allowed for ZIP`))
        }
        if (!archiveUrl.endsWith('.zip')) {
          throw toFetchError(new Error(`invalid ${archiveUrl}, file must end with ".zip"`))
        }
    
        try {
          /*let itemList = [path]
          // if path is a file => getLinks
          if (!path.endsWith('/') && options.links === SolidFileClient.LINKS.INCLUDE) {
            itemList = [path, ...Object.values(await this.getItemLinks(path, options))].flat()
          }
          */
          return this.getAsZip(path, options)  // { path }, itemList, options)
            .then(zip => this.generateAsync({ type: 'blob' }))
            .then(blob => api.createFile(archiveUrl, blob, 'application/zip'))
        } catch (err) {
          throw toFetchError(new Error(`getAsZip ${err}`))
        }
    }

  /**
   * Wrap API response for zipping multiple items
   */
    async getAsZip (path, options) { // itemList, options) {
        options = {
        links: SolidFileClient.LINKS.INCLUDE,
        withAcl: true,
        withMeta: true,
        agent: 'to_target',
        createPath: true,
        ...options
        }
        let itemList = [path]
        // if path is a file => getLinks
        if (!path.endsWith('/') && options.links === SolidFileClient.LINKS.INCLUDE) {
        itemList = [path, ...Object.values(await api.getItemLinks(path, options))].flat()
        }
        const zip = {} // new JSZip()

        return this.addItemsToZip(zip, path, itemList, options)
        .then(() => zip)
    }

  /**
   * Add items with links to a zip object recursively
   */
  async addItemsToZip (zip, path, itemList, options) {
    console.log(Object.values(path) + '\n' + itemList)
    var promises = itemList.map(async item => {
      const itemName = getItemName(item)
      // zip folders with links
      if (item.endsWith('/')) {
        const zipFolder = this.zip.folder(itemName)
        if (options.links === SolidFileClient.LINKS.INCLUDE) {
          const links = await api.getItemLinks(item, options)
          let itemLinks = [...Object.values(links)]
          if (links.meta) {
            itemLinks = [itemLinks, ...Object.values(await api.getItemLinks(links.meta, options))].flat()
          }
          if (itemLinks.length) await api.zipItemLinks(zipFolder, itemLinks, '', item, options)
        }
        const folderPath = item
        const folderItems = await api.getItemList(folderPath, options)
        await this.addItemsToZip(zipFolder, folderPath, folderItems, options)
      // zip file links
      } else if (item.endsWith('.acl') || item.endsWith('.meta')) {
        const parentName = itemName.replace(new RegExp('.acl$'), '').replace(new RegExp('.meta$'), '')
        const { fileName, content } = await api.itemLinkContent(item, parentName, options)
        await this.zip.file(fileName, content)
      // zip files
      } else {
//        const fileContent = await this.readFile(item)
//        await zip.file(itemName, fileContent)
        const blob = await api.getFileBlob(item)
        await this.zip.file(itemName, blob, { binary: true })
      }
    })

    return Promise.all(promises)
  }
}

export default {
    Zip
}