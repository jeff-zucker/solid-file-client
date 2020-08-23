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
// const aclModesInit = { Read: 0, Append: 0, Write: 0, Control: 0 }
/**
 * const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin', 'default']
 *
 * aclObject is a string, aclPredicates related :
 * - agent: webId, bot, application, ...
 * - agentClass: 'agent'
 * - agentGroup: URI
 * - origin: origin url
 * - default: '' (blank string)
 */
const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin', 'default']

const _newUser = (userAgent) => {
  const predicate = Object.keys(userAgent)
  if (!aclPredicates.find(item => item === predicate[0])) {
    throw toFetchError(new Error(`${predicate[0]} is not an agentType`))
  }
  let user = predicate[0] + '&' + userAgent[predicate[0]]
  if (predicate[0] === 'default') user = predicate[0] + '&'
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
   * @returns {object} aclAgents
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
    const aclagents = {}
    for (const i in aclPred) {
      const user = await rdf.query(url, null, { acl: aclPred[i] })
      for (const j in user) {
        let object = user[j].object.value
        if (object.includes(acl)) object = object.split(acl)[1]
        if (object.includes(foaf)) object = object.split(foaf)[1]
        const key = aclPred[i] + '&' + object
        if (!aclagents[key]) {
          aclagents[key] = {
            mode: { Read: 0, Append: 0, Write: 0, Control: 0 },
            agent: { predicate: aclPred[i], object: object }
          }
        }

        // forEach object mode acl: xxx
        const mode = await rdf.query(url, user[j].subject, { acl: 'mode' })
        const testMode = {}
        for (const k in mode) {
          const aclMode = mode[k].object.value.split('#')[1]
          testMode[aclMode] = 1
        } // end k
        aclagents[key].mode = Object.assign(aclagents[key].mode, testMode)
      } // end j
    } // end i
    return aclagents
  }

  /**
   * create turtle aclcontent for url resource from aclAgents object
   * @param {string} url ressource (not url.acl)
   * @param {object} aclAgents
   * @returns {string} text/turtle aclContent
   */
  async createContent (url, aclAgents) {
    if (!Object.keys(aclAgents).length) {
      throw toFetchError(new Error('Cannot not create acl document : there are no agents'))
    }
    const aclSubject = {}
    // check if acl:default has already been managed
    // there is at least one rule with acl:default in a folder document acl
    let addAclDefault = true
    if (aclAgents['default&']) {
      if (url.endsWith('/')) addAclDefault = false
      else { delete aclAgents['default&'] }
    }
    // build sort key and key values
    for (const user in aclAgents) {
      let i = 1
      let keyValue = 0
      let keySubject = ''
      let keyMode = 'n0:mode'
      for (const j in aclAgents[user].mode) {
        keyValue = keyValue + aclAgents[user].mode[j] * i
        i = i * 2
        if (aclAgents[user].mode[j]) {
          keySubject = keySubject + j
          keyMode = keyMode + ' n0:' + j + ','
        }
      }
      if (keyValue) {
        aclAgents[user].key = keyValue
        keyMode = keyMode.substring(0, keyMode.length - 1) + '.'
        aclSubject[keyValue] = { subject: keySubject, mode: keyMode }
      }
    }
    if (!Object.keys(aclSubject).length) {
      throw toFetchError(new Error('Cannot create the acl document : there are no rules'))
    }

    // build prefix
    const target = url.endsWith('/') ? './' : getItemName(url)
    const aclPrefix = `@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix target: <${target}>.
`
    let aclContent = aclPrefix
    // forEach key.value build an acl block
    for (const i in aclSubject) {
      const aclName = aclSubject[i].subject
      let aclBlock = '\n' + `:${aclName}` +
          '\n    a n0:Authorization;' +
          '\n    n0:accessTo target:;'
      for (const j in aclAgents) {
        if (aclAgents[j].key.toString() === i) {
          // const item = j.split('&')
          const predicate = 'n0:' + aclAgents[j].agent.predicate // item[0]
          let object = aclAgents[j].agent.object // item[1]
          if (object === 'Agent') object = 'n1:' + object
          else if (object === 'AuthenticatedAgent') object = 'n0:' + object
          else if (predicate === 'n0:default') object = 'target:'
          else object = '<' + object + '>'
          aclBlock = aclBlock + '\n' + `    ${predicate} ${object};`
        }
      }
      if (url.endsWith('/') && addAclDefault) aclBlock = aclBlock + '\n    n0:default target:;'
      aclBlock = aclBlock + `\n    ${aclSubject[i].mode}` + '\n'
      aclContent = aclContent + aclBlock
    }
    aclContent = this.makeContentRelative(aclContent, url, target, { agent: 'to_target' })

    return aclContent
  }

  /**
   * modify aclAgents object by adding agents and/or modes
   * @param {object} aclAgents
   * @param {array} userAgent array of objects { aclPredicate: aclObject }
   * @param {array} userMode ['Read']
   * @returns {object} aclAgents
   */
  async addUserMode (aclAgents, userAgent, userMode) {
    if (!Array.isArray(userAgent) || !Array.isArray(userMode)) {
      throw toFetchError(new Error('Parameters should be Arrays'))
    }
    if (userAgent && userAgent.length) {
      for (const j in userAgent) {
        const { user, agent } = _newUser(userAgent[j])
        if (!aclAgents || !aclAgents[user]) {
          aclAgents[user] = {
            mode: { Read: 0, Append: 0, Write: 0, Control: 0 }, // aclModesInit,
            agent: agent // { predicate: predicate[0], object: userAgent[j][predicate[0]] }
          }
        }
        if (userMode && userMode.length) {
          aclAgents[user].mode = Object.assign(aclAgents[user].mode, _updateMode(userMode, true))
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
   * @returns {object} aclAgents
   */
  async deleteUserMode (aclAgents, userAgent, userMode) {
    if (!Array.isArray(userAgent) || (userMode && !Array.isArray(userMode))) {
      throw toFetchError(new Error('Parameters should be Arrays)'))
    }
    if (userAgent && userAgent.length) {
      for (const j in userAgent) {
        const { user } = _newUser(userAgent[j])
        let keyValue = 0
        if (aclAgents[user]) {
          if (userMode && userMode.length) {
            aclAgents[user].mode = Object.assign(aclAgents[user].mode, _updateMode(userMode, false))
            let i = 1
            for (const j in aclAgents[user].mode) {
              keyValue = keyValue + aclAgents[user].mode[j] * i
              i = i * 2
            }
          }
          if (!keyValue) delete aclAgents[user]
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
   * Check that .acl or .meta content of itemUrl is valid.
   * URI is usually the webId checked to have 'Control' authorization
   * 'may' optional acl: Authorization, obligation acl: default for folder
   * 'must' : spec compliant obligation acl: Authorization, optional acl: default for folder
   *
   * @param {string} itemUrl
   * @param {string} content
   * @param {string} URI
   * @param {object} options
   * { aclAuth: 'must'-'may' }
   * { aclDefault: 'must'-'may' }
   * @result {object} { err: [blocking errors], info: [non blocking anomalies]}
   */

  /**
   * URI can be any valid Agent (person, group, software Bot)
   * check that URI or Public has control and that the acl is well-formed
   * URI is usually the webId checked to have 'Control' authorization
   * 'aclDefault: 'must' (none spec compliant) one acl: Default is needed for folder ACL
   * 'must' : spec compliant acl: Authorization is an obligation
   *
   * @param {string} itemUrl
   * @param {string} content
   * @param {string} URI
   * @param {object} options
   * { aclAuth: 'must'-'may' }
   * { aclDefault: 'must'-'may' }
   * @result {object} { err: [blocking errors], info: [non blocking anomalies]}
   */
  async isValidAcl (itemUrl, aclContent, URI, options) {
    options = {
      aclMode: 'Control',
      aclAuth: 'must',
      aclDefault: 'must',
      ...options
    }
    // acl content for URI or public (authorization, Control, accessTo)
    // groups are not checked for 'Control'
    if (itemUrl.endsWith('.acl')) throw toFetchError(new Error('url is the resource, not the auxillary link acl'))
    if (!URI) throw toFetchError(new Error('URI is needed'))
    // check if URI has aclMode (control)
    rdf.setPrefix('URI', URI)
    const resAcl = await checkAcl(itemUrl, aclContent, options)
    if (resAcl.err === ['incorrect RDF']) return resAcl
    const resMode = await aclMode(itemUrl, aclContent, null, null, { URI: '' }, options)
    const isValidAcl = {
      err: resAcl.err.concat(resMode.err),
      info: resAcl.info.concat(resMode.info)
    }
    // is relative notation to url or to pod
    const item = itemUrl.replace(getRootUrl(itemUrl), '')
    if (aclContent.includes('/' + item.split('.acl')[0]) || aclContent.includes(`${getRootUrl(itemUrl)}profile/card#`)) {
      isValidAcl.info = isValidAcl.info.concat(['you could use relative notation'])
    }
    return isValidAcl
  }

  /**
   * is valid RDF
   * @param {string} itemUrl
   * @param {string} content
   */
  async isValidRDF (itemUrl, content) {
    try {
      const res = await rdf.queryTurtle(itemUrl, content)
      return { err: [], info: [] }
    } catch (e) { return { err: ['incorrect RDF'], info: [e] } }
  }
}

/**
 * Check if a user or everybody has an auth
 *
 * @param {string} itemUrl
 * @param {string} aclContent
 * @param {object} s to check a specific block ( null for all]
 * @param {object} p to check a specific agent type (null for all)
 * @param {object} o URI of person, group, bot, trusted app, ....
 * @param {object} options { aclMode: 'Control' } by default
*/
const aclMode = async (itemUrl, aclContent, s, p, o, options) => {
  options = {
    aclMode: 'Control',
    ...options
  }

  const res = { err: [], info: [] }
  try {
    // find acl blocks with 'auth' ('Control' ('write' may be enough with atomic delete))
    const aclMode = await rdf.queryTurtle(itemUrl, aclContent, s, { acl: 'mode' }, { acl: options.aclMode })
    if (!aclMode.length) { res.err = [`no acl:${options.aclMode}`]; return res }

    for (const i in aclMode) {
      const aclItem = aclMode[i].subject.value
      rdf.setPrefix('aclItem', aclItem)
      // check if agent or everybody has 'auth'
      const aclAgent = await rdf.query(itemUrl, { aclItem: '' }, p, o)
      if (!aclAgent.length) {
        const aclPublic = await rdf.query(itemUrl, { aclItem: '' }, { acl: 'agentClass' }, null)
        res.err = aclPublic.length ? [] : [`noAgent with ${options.aclMode}`]
      } else {
        res.err = []
      }
      if (res.err === []) return res
    }
  } catch (err) {
    return { err: ['incorrect RDF'], info: [err] }
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
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:accessTo`])
      } else if (aclAccessTo[0].object.value !== aclParent) {
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has invalid acl:accessTo URI (${aclAccessTo[0].object.value})`])
      }
      // check for acl:mode
      const aclMode = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'mode' }, null)
      if (!aclMode.length) res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:mode`])

      // for folder check for acl: 'default'
      resType = options.aclDefault === 'must' ? 'err' : 'info'
      if (itemUrl.endsWith('/.acl') || itemUrl.endsWith('/')) {
        const aclDefault = await rdf.query(itemUrl, { aclSubj: '' }, { acl: 'default' }, null)
        if (!aclDefault.length) {
          res[resType] = res[resType].concat([`"${aclItem.split('#')[1]}" has no acl:default - you cannot inherit`])
        } else if (aclDefault[0].object.value !== aclParent) {
          res.err = res.err.concat([`${aclItem.split('#')[1]} has invalid acl:default URI`])
        }
      }
    }
    return res
  } catch (err) {
    return { err: ['incorrect RDF'], info: [err] }
  }
}

export default AclParser
