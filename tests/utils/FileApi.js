import fs from 'fs-extra'

// Note: Errors here should be thrown in a way that they work for TestFolderGenerator
//       For instance, TestFolderGenerator._removeFile checks if the response status is 404, so delete has to return 404 if it didn't exist
class FileApi {
    constructor(prefix) {
        this._prefix = prefix
    }

    _mapUrl(url) {
        if (!url.startsWith(this._prefix)) {
            console.error('Invalid url', url, this._prefix)
            throw new Error()
        }
        return url.substr(this._prefix.length)
    }

    deleteFolderRecursively(url) {
        // return fs.promises.rmdir(this._mapUrl(url), { recursive: true })
        return fs.remove(this._mapUrl(url))
    }
    delete(url) {
        return fs.promises.unlink(this._mapUrl(url))
            .catch(err => err.errno === -2 ? { status: 404 } : err)
    }
    itemExists(url) {
        return fs.promises.access(this._mapUrl(url))
            .then(() => true)
            .catch(() => false)
    }
    createFolder(url) {
        return fs.promises.mkdir(this._mapUrl(url))
    }
    createFile(url, content, contentType) {
        return fs.promises.writeFile(this._mapUrl(url), content)
    }
}

export default FileApi
