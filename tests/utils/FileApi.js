import fs from 'fs'

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
        return fs.promises.rmdir(this._mapUrl(url), { recursive: true })
    }
    deleteFile(url) {
        return fs.promises.unlink(this._mapUrl(url))
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