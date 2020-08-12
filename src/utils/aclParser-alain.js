import apiUtils from './apiUtils'
import errorUtils from './errorUtils'
import RdfQuery from './rdf-query'

const { getRootUrl, getItemName } = apiUtils
const { toFetchError } = errorUtils
const rdf = new RdfQuery()

const aclModes = ['Read', 'Append', 'Write', 'Control']
// const aclModesInit = { Read: 0, Append: 0, Write: 0, Control: 0 }
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
 */
class AclParser {
  constructor () {
    this.aclAgents = {}
  }

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
   * @param {array} userAgent [aclPredicate: aclObject]
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
   * @param {array} userAgent [aclPredicate: aclObject]
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
}

export default AclParser
