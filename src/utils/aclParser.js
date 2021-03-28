import apiUtils from './apiUtils'
import errorUtils from './errorUtils'
import RdfQuery from './rdf-query'

const { getRootUrl, getItemName } = apiUtils
const { toFetchError } = errorUtils
const rdf = new RdfQuery()

/**
 *const aclModes = ['Read', 'Append', 'Write', 'Control']
 */
const aclModes = ['Read', 'Append', 'Write', 'Control']

/**
 *const aclAccesses = ['accessTo', 'default']
 */
const aclAccesses = ['accessTo', 'default']
// const aclModesInit = { Read: 0, Append: 0, Write: 0, Control: 0 }

/**
 * const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin', 'default']
 *
 * aclObject is a string, aclPredicates related :
 * - agent: webId, bot, application, ...
 * - agentClass: 'Agent'
 * - agentGroup: URI
 * - origin: origin url
 * - default: '' (blank string)
 */
const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin'] // , 'default']

const _newUser = (userAgent) => {
  const predicate = Object.keys(userAgent)
  if (!aclPredicates.find(item => item === predicate[0])) {
    throw toFetchError(new Error(`${predicate[0]} is not an agentType`))
  }
  const user = predicate[0] + '&' + userAgent[predicate[0]]
  const agent = { predicate: predicate[0], object: userAgent[predicate[0]] }
  return { user, agent }
}

const _updateMode = (userMode, add) => {
  const addMode = {}
  for (const i in userMode) {
    if (!aclModes.find(item => item === userMode[i])) {
      throw toFetchError(new Error(userMode[i] + ' is an unknown mode'))
    }
    addMode[userMode[i]] = add ? 1 : 0
  }
  return addMode
}

const _updateAccess = (userAccess, add) => {
  const addAccess = {}
  for (const i in userAccess) {
    if (!aclAccesses.find(item => item === userAccess[i])) {
      throw toFetchError(new Error(userAccess[i] + ' is an unknown access type'))
    }
    addAccess[userAccess[i]] = add ? 1 : 0
  }
  return addAccess
}

/**
 * Class for working with ACL
 * using an aclAgents object
 * @alias 'solidAPI.acl'
 */
class AclParser {
  /**
   * aclcontent parser
   * @param {string} url resource
   * @param {string} aclcontent of url.acl
   * @returns {object|array} aclAgents Object or Array of Objects
   */
  async contentParser (url, aclcontent) {
    if (!url) throw toFetchError(new Error('an url is needed'))
    const acl = 'http://www.w3.org/ns/auth/acl#'
    const foaf = 'http://xmlns.com/foaf/0.1/'

    // find all predicates
    const resAcl = await rdf.queryTurtle(url, aclcontent)
    if (!resAcl.length) {
      throw toFetchError(new Error('not an acl aclcontent'))
    }

    // build aclagents predicate list
    const aclAgents = []
    const aclList = {}
    for (const i in resAcl) {
      const aclItem = resAcl[i].predicate.value
      const excludes = ['accessTo', 'default', 'mode', 'defaultForNew'] // defaultForNew is deprecated
      const exclude = excludes.find(element => aclItem.includes(element))
      if (aclItem.includes(acl) && !exclude) aclList[aclItem.split('#')[1]] = ''
    }
    const aclPred = Object.keys(aclList)
    if (!aclPred.length) {
      throw toFetchError(new Error('not an acl content'))
    }

    // forEach predicate acl:
    for (const i in aclPred) {
      let aclBlock = 0
      const user = await rdf.query(url, null, { acl: aclPred[i] })
      for (const j in user) {
        let object = user[j].object.value
        if (object.includes(acl)) object = object.split(acl)[1]
        if (object.includes(foaf)) object = object.split(foaf)[1]
        const key = aclPred[i] + '&' + object
        // unique key in each aclAgents[aclBlock]
        for (let block = 0; ; block++) {
          aclBlock = block
          if (!aclAgents[aclBlock] || !aclAgents[aclBlock][key]) break
        }
        if (!aclAgents[aclBlock]) aclAgents[aclBlock] = {}
        aclAgents[aclBlock][key] = {
          mode: { Read: 0, Append: 0, Write: 0, Control: 0 }, // accessTo: 0, default: 0 },
          agent: { predicate: aclPred[i], object: object },
          access: { accessTo: 0, default: 0 }
        }

        // forEach object mode acl: xxx
        const mode = await rdf.query(url, user[j].subject, { acl: 'mode' })
        const testMode = {}
        for (const k in mode) {
          const aclMode = mode[k].object.value.split('#')[1]
          testMode[aclMode] = 1
        } // end k
        aclAgents[aclBlock][key].mode = Object.assign(aclAgents[aclBlock][key].mode, testMode)

        // forEach object acl:accessTo or acl:default
        const accessType = ['accessTo', 'default'] // defaultForNew
        let access
        for (const l in accessType) {
          const accessValue = {}
          access = await rdf.query(url, user[j].subject, { acl: accessType[l] })
          if (access.length) {
            accessValue[accessType[l]] = 1
            aclAgents[aclBlock][key].access = Object.assign(aclAgents[aclBlock][key].access, accessValue)
          }
        } // end l
      } // end j
    } // end i
    return (aclAgents.length > 1) ? aclAgents : aclAgents[0]
  }

  /**
   * create turtle aclcontent for url resource from aclAgents object
   * @param {string} url ressource (not url.acl)
   * @param {object|array} aclAgents object or Array of objects
   * @param {object} options for isValidAcl()
   * @property {options.aclDefault} 'may' ('must' is more prudent)
   * @property {options.aclMode} 'Control'
   * @property {options.URI} if used check that at least this URI has 'Control'
   * @returns {string} text/turtle aclContent
   */
  async createContent (url, aclAgents, options) {
    options = {
      aclDefault: 'may',
      aclMode: 'Control',
      ...options
    }

    // build prefix
    const target = url.endsWith('/') ? './' : getItemName(url)
    const aclPrefix = `@prefix : <#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix target: <${target}>.
`
    let aclContent = aclPrefix

    const agentsArray = Array.isArray(aclAgents) ? aclAgents : [aclAgents]

    for (const i in agentsArray) {
      const aclAgent = agentsArray[i]
      if (!Object.keys(aclAgent).length) {
        throw toFetchError(new Error('Cannot create acl document : there are no agents'))
      }
      const aclSubject = {}
      // TODO review completely
      // check if acl:default has already been managed
      // there is at least one rule with acl:default in a folder document acl
      /* let addAclDefault = true
      if (aclAgents['default&']) {
        if (url.endsWith('/')) addAclDefault = false
        else { delete aclAgents['default&'] }
      } */

      // build sort key and key values
      for (const user in aclAgent) {
        let i = 1
        let keyValue = 0
        let keySubject = ''
        // mode
        let keyMode = 'acl:mode'
        for (const j in aclAgent[user].mode) {
          keyValue = keyValue + aclAgent[user].mode[j] * i
          i = i * 2
          if (aclAgent[user].mode[j]) {
            keySubject = keySubject + j
            keyMode = keyMode + ' acl:' + j + ','
          }
        }
        // access
        let keyAccess = ''
        // for folder : subject name ends with Default, only when there is no acl:accessTo
        if (url.endsWith('/')) {
          if (aclAgent[user].access.default && !aclAgent[user].access.accessTo) keySubject = keySubject + 'Default'
          // no default for file
        } else {
          aclAgent[user].access = Object.assign(aclAgent[user].access, { accessTo: 1, default: 0 })
        }
        for (const k in aclAgent[user].access) {
          keyValue = keyValue + aclAgent[user].access[k] * i
          i = i * 2
          if (aclAgent[user].access[k]) {
            keyAccess = keyAccess + '\n    acl:' + k + ' target:;'
          }
        }
        if (keyValue) {
          aclAgent[user].key = keyValue
          keyMode = keyMode.substring(0, keyMode.length - 1) + '.'
          aclSubject[keyValue] = { subject: keySubject, mode: keyMode, access: keyAccess }
        }
      } // end user
      if (!Object.keys(aclSubject).length) {
        throw toFetchError(new Error('Cannot create the acl document : there are no rules'))
      }

      // forEach key.value build an acl block
      for (const i in aclSubject) {
        const aclName = aclSubject[i].subject
        let aclBlock = '\n' + `:${aclName}` +
            '\n    a acl:Authorization;' +
            aclSubject[i].access
        for (const j in aclAgent) {
          if (aclAgent[j].key.toString() === i) {
            // const item = j.split('&')
            const predicate = 'acl:' + aclAgent[j].agent.predicate // item[0]
            let object = aclAgent[j].agent.object // item[1]
            if (object === 'Agent') object = 'foaf:' + object
            else if (object === 'AuthenticatedAgent') object = 'acl:' + object
            // else if (predicate === 'acl:default') object = 'target:'
            else object = '<' + object + '>'
            aclBlock = aclBlock + '\n' + `    ${predicate} ${object};`
          }
        }
        // if (url.endsWith('/') && addAclDefault) aclBlock = aclBlock + '\n    acl:default target:;'
        aclBlock = aclBlock + `\n    ${aclSubject[i].mode}` + '\n'
        aclContent = aclContent + aclBlock
      }
    } // end agentsArray

    // makerelative
    aclContent = this.makeContentRelative(aclContent, url, target, { agent: 'to_target' })
    // check is valid acl
    const isValid = await this.isValidAcl(url, aclContent, options) // options.webId, options)
    if (isValid.err.length) throw toFetchError(new Error('invalid aclContent : ' + isValid.err))

    return aclContent
  }

  /**
   * modify aclAgents object by adding agents and/or modes and/or access types
   * @param {object} aclAgents
   * @param {array} userAgent array of objects { aclPredicate: aclObject }
   * @param {array} userMode ['Read']
   * @param {array} userAccess
   * @property {userAccess} default value ['accessTo', 'default']
   * @returns {object} aclAgents
   */
  async addUserMode (aclAgents, userAgent, userMode, userAccess = ['accessTo', 'default']) {
    if (Array.isArray(aclAgents) || !Array.isArray(userAgent) || !Array.isArray(userMode) || !Array.isArray(userAccess)) {
      throw toFetchError(new Error('Parameters should be Arrays, except first'))
    }
    if (userAgent && userAgent.length) {
      for (const j in userAgent) {
        const { user, agent } = _newUser(userAgent[j])
        if (!aclAgents || !aclAgents[user]) {
          aclAgents[user] = {
            mode: { Read: 0, Append: 0, Write: 0, Control: 0 }, // aclModesInit,
            agent: agent,
            access: { accessTo: 0, default: 0 }
          }
        }
        if (userMode && userMode.length) {
          aclAgents[user].mode = Object.assign(aclAgents[user].mode, _updateMode(userMode, true))
        } else { throw toFetchError(new Error('no modes in userMode')) }
        if (userAccess && userAccess.length) {
          aclAgents[user].access = Object.assign(aclAgents[user].access, _updateAccess(userAccess, true))
        } else { throw toFetchError(new Error('no modes in userMode')) }
      }
      return aclAgents
    }
    throw toFetchError(new Error('no agent in userAgent'))
  }

  /**
   * modify aclAgents object by removing agents and/or modes
   * @param {object} aclAgents
   * @param {array} userAgent array of objects { aclPredicate: aclObject }
   * @param {array} userMode ['Read']
   * @param {array} userAccess ['accessTo', 'default']
   * @returns {object} aclAgents
   */
  async deleteUserMode (aclAgents, userAgent, userMode, userAccess) {
    if (Array.isArray(aclAgents) || !Array.isArray(userAgent) || (userMode && !Array.isArray(userMode)) || (userAccess && !Array.isArray(userAccess))) {
      throw toFetchError(new Error('Parameters should be Arrays, except first'))
    }
    if (userAgent && userAgent.length) {
      for (const j in userAgent) {
        const { user } = _newUser(userAgent[j])
        let modeValue = 0
        let accessValue = 0
        if (aclAgents[user]) {
          if (userMode && userMode.length) {
            aclAgents[user].mode = Object.assign(aclAgents[user].mode, _updateMode(userMode, false))
            let i = 1
            for (const j in aclAgents[user].mode) {
              modeValue = modeValue + aclAgents[user].mode[j] * i
              i = i * 2
            }
          }
          if (userAccess && userAccess.length) {
            aclAgents[user].access = Object.assign(aclAgents[user].access, _updateAccess(userAccess, false))
            let i = 1
            for (const j in aclAgents[user].access) {
              accessValue = accessValue + aclAgents[user].access[j] * i
              i = i * 2
            }
          }
          // remove 'user' if no mode, or if no accessTo and no default
          if (!modeValue || !accessValue) delete aclAgents[user]
        }
      }
      return aclAgents
    }
    throw toFetchError(new Error('no agent in userAgent'))
  }

  /**
   * Make aclContent relative to url resource
   * - make absolute paths relative to folder
   * - make relative paths to pod relative to folder
   * - update relative paths to the new location
   * @param {string} aclcontent
   * @param {string} itemUrl resource url (not an url.acl)
   * @param {string} toName destination name ('' or file name)
   * @param {object} options for agent
   */
  makeContentRelative (aclcontent, itemUrl, toName, options) {
    const item = '/' + itemUrl.replace(getRootUrl(itemUrl), '')
    if (aclcontent.includes(item)) {
      // if object values are absolute URI's or relative to POD, make them relative to the destination folder
      aclcontent = aclcontent.replace(new RegExp('<' + itemUrl + '>', 'g'), '<./' + toName + '>')
      aclcontent = aclcontent.replace(new RegExp('<' + item + '>', 'g'), '<./' + toName + '>')
    }
    const fromName = getItemName(itemUrl)
    if (toName !== fromName) {
      // if relative replace file destination
      aclcontent = aclcontent.replace(new RegExp(fromName + '>', 'g'), toName + '>')
    }
    if (options.agent === 'to_target') {
      aclcontent = aclcontent.replace(new RegExp('<' + getRootUrl(itemUrl) + 'profile/card#', 'g'), '</profile/card#')
      aclcontent = aclcontent.replace(new RegExp('<' + getRootUrl(itemUrl) + 'profile/card#me>', 'g'), '</profile/card#me>')
    }
    if (options.agent === 'to_source') {
      aclcontent = aclcontent.replace(new RegExp('</profile/card#', 'g'), '<' + getRootUrl(itemUrl) + 'profile/card#')
      aclcontent = aclcontent.replace(new RegExp('</profile/card#me>', 'g'), '<' + getRootUrl(itemUrl) + 'profile/card#me>')
    }
    return aclcontent
  }

  /**
   * check that atleast an agent type has control and that the acl is well-formed
   * URI is usually the webId checked to have 'Control' authorization
   * aclDefault: 'may' (spec compliant), if 'must' then one acl: Default is needed for folder ACL
   * aclAuth 'must' : spec compliant acl: Authorization is mandatory
   *
   * @param {string} itemUrl
   * @param {string} content
   * @param {object} options
   * @property {options.aclMode} 'Control'
   * @property {options.aclAuth} 'must'
   * @property {options.aclDefault} 'may'
   * @result {object} { err: [blocking errors], info: [non blocking anomalies]}
   */
  async isValidAcl (itemUrl, aclContent, options) {
    options = {
      aclMode: 'Control',
      aclAuth: 'must',
      aclDefault: 'may', // 'must',
      ...options
    }
    // check acl content (authorization, Control, accessTo)
    if (itemUrl.endsWith('.acl')) throw toFetchError(new Error('url is the resource, not the auxillary link acl'))
    const resAcl = await checkAcl(itemUrl, aclContent, options)
    if (resAcl.err === ['incorrect RDF']) return resAcl
    const resMode = await aclMode(itemUrl, aclContent, options) // null, null, { URI: '' }, options)
    const isValidAcl = {
      err: resAcl.err.concat(resMode.err),
      info: resAcl.info.concat(resMode.info)
    }
    // is notation relative to url or to pod
    const item = itemUrl.replace(getRootUrl(itemUrl), '')
    if (aclContent.includes('/' + item.split('.acl')[0]) || aclContent.includes(`${getRootUrl(itemUrl)}profile/card#`)) {
      isValidAcl.info = isValidAcl.info.concat(['you could use relative notation'])
    }
    return isValidAcl
  }

  /**
   * is valid RDF (parses with N3.js)
   * @param {string} itemUrl
   * @param {string} content
   * @param {object} options
   * @property {options.baseIRI} default to itemUrl
   * @property {options.format} none|'text/n3'
   */
  async isValidRDF (itemUrl, content, options) {
    options = {
      baseIRI: itemUrl,
      ...options
    }
    try {
      await rdf._parse(content, options) // queryTurtle(itemUrl, content)
      return { err: [], info: [] }
    } catch (e) { return { err: ['incorrect RDF'], info: [e.message] } }
  }
}

/**
 * Check if a user or everybody has an auth
 *
 * @param {string} itemUrl
 * @param {string} aclContent
 * @param {object} options
 * @property { options.aclMode } 'Control' by default
 * @property {options.URI} check for 'Control' for a single URI : person, group, ....
*/
const aclMode = async (itemUrl, aclContent, options) => {
  options = {
    aclMode: 'Control',
    ...options
  }

  const res = { err: [], info: [] }
  try {
    // find acl blocks with 'auth' ('Control' ('write' may be enough with atomic delete))
    const aclMode = await rdf.queryTurtle(itemUrl, aclContent, null, { acl: 'mode' }, { acl: options.aclMode }) // s
    if (!aclMode.length) { res.err = [`no acl:${options.aclMode}`]; return res }

    for (const i in aclMode) {
      const aclItem = aclMode[i].subject.value
      rdf.setPrefix('aclItem', aclItem)
      // check if acl block has acl:accessTo
      const aclAccessTo = await rdf.query(itemUrl, { aclItem: '' }, { acl: 'accessTo' }, null)
      // check if an agent has 'auth'
      const agentsPredicates = aclPredicates.filter(item => item !== 'origin')
      let aclAgent = []
      // options.URI
      let o // = null
      if (options.URI) {
        rdf.setPrefix('URI', options.URI)
        o = { URI: '' }
      }
      for (const j in agentsPredicates) {
        aclAgent = aclAgent.concat(await rdf.query(itemUrl, { aclItem: '' }, { acl: agentsPredicates[j] }, o))
      }
      res.err = (aclAgent.length && aclAccessTo.length) ? [] : [`no agent with ${options.aclMode} and acl:accessTo`]
    }
  } catch (err) {
    return { err: ['incorrect RDF'], info: [err.message] }
  }
  return res
}

/**
 *
 * @param {string} itemUrl
 * @param {string} aclContent
 * @param {object} options
 */
const checkAcl = async (itemUrl, aclContent, options) => {
  options = {
    aclAuth: 'must',
    aclDefault: 'must',
    ...options
  }

  let resType
  const res = { err: [], info: [] }
  const aclParent = itemUrl.split('.acl')[0]

  try {
    // load aclContent in store
    const acl = await rdf.queryTurtle(itemUrl, aclContent)

    // build subject list
    const aclList = {}
    for (const i in acl) {
      const aclItem = acl[i].subject.value
      aclList[aclItem] = ''
    }
    const aclSubj = Object.keys(aclList)

    // check each acl subject block
    for (const i in aclSubj) {
      const aclItem = aclSubj[i]
      rdf.setPrefix('aclSubj', aclItem)

      // check for acl: 'authorization', not actually a blocking error
      resType = options.aclAuth === 'must' ? 'err' : 'info'
      const aclAuthorization = await rdf.query(itemUrl, { aclSubj: '' }, null, { acl: 'Authorization' })
      if (!aclAuthorization.length) res[resType] = res[resType].concat([`"${aclItem.split('#')[1]}" has no acl:Authorization`])

      // check for users
      const aclAgent = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'agent' }, null)
      const aclAgentClass = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'agentClass' }, null)
      const aclAgentGroup = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'agentGroup' }, null)
      if ((aclAgent.length + aclAgentClass.length + aclAgentGroup) === '0') res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no user`])

      // check for accessTo
      const aclAccessTo = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'accessTo' }, null)
      if (!aclAccessTo.length) {
        // res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:accessTo`])
      } else if (aclAccessTo[0].object.value !== aclParent) {
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has invalid acl:accessTo URI (${aclAccessTo[0].object.value})`])
      }

      // for folder check URI for acl:default
      let aclDefault = []
      if (itemUrl.endsWith('/.acl') || itemUrl.endsWith('/')) {
        aclDefault = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'default' }, null)
        if (aclDefault.length && aclDefault[0].object.value !== aclParent) {
          res.err = res.err.concat([`${aclItem.split('#')[1]} has invalid acl:default URI`])
        }
      }
      if (!(aclAccessTo.length + aclDefault.length)) {
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:accessTo and no acl:default`])
      }

      // check for acl:mode
      const aclMode = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'mode' }, null)
      if (!aclMode.length) res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:mode`])
      else {
        for (const j in aclMode) {
          const modeValue = aclMode[j].object.value
          if (!aclModes.find(value => modeValue === `http://www.w3.org/ns/auth/acl#${value}`)) {
            res.err = res.err.concat([`"${aclItem.split('#')[1]}" ${modeValue.split('#')[1]} is an invalid acl:mode`])
          }
        }
      }
    }

    // for folder check for at least one acl:default in document
    resType = options.aclDefault === 'must' ? 'err' : 'info'
    if (itemUrl.endsWith('/.acl') || itemUrl.endsWith('/')) {
      const aclDefault = await rdf.query(itemUrl, null, { acl: 'default' }, null)
      if (!aclDefault.length) {
        res[resType] = res[resType].concat(['To inherit at least one ACl block needs acl:default'])
      }
    }
    return res
  } catch (err) {
    return { err: ['incorrect RDF'], info: [err.message] }
  }
}

export default AclParser
