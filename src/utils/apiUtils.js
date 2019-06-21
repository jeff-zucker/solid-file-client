const LINK = {
  CONTAINER: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
  RESOURCE: '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
}

/**
 * Return url without slashes at the end
 * @param {string} url
 * @returns {string}
 */
const removeSlashesAtEnd = url => {
  while (url.endsWith('/')) {
    url = url.slice(0, -1)
  }
  return url
}

/**
 * Return the url of the parent (including '/' at the end)
 * @param {string} url
 * @returns {string}
 */
const getParentUrl = url => {
  url = removeSlashesAtEnd(url)
  return url.substring(0, url.lastIndexOf('/') + 1)
}

/**
 * Return the name of the folder/file
 * @param {string} url
 * @returns {string}
 */
const getItemName = url => {
  url = removeSlashesAtEnd(url)
  return url.substr(url.lastIndexOf('/') + 1)
}

/**
 * Return true if all urls point to folders
 * @param  {...string} urls
 */
const areFolders = (...urls) => urls.every(url => url.endsWith('/'))

/**
 * Return true if all urls point to files
 * @param  {...string} urls
 */
const areFiles = (...urls) => urls.every(url => !url.endsWith('/'))

export default {
  getParentUrl,
  getItemName,
  areFolders,
  areFiles,
  LINK
}
