
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

export default {
  _parseLinkHeader,
  _urlJoin
}
