import apiUtils from './apiUtils'
import errorUtils from './errorUtils'
import RdfQuery from './rdf-query'

const { getRootUrl } = apiUtils
const { toFetchError } = errorUtils
const rdf = new RdfQuery()

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
 * { aclAuth: 'may'|'must' }
 * { aclDefault: 'must'|'may' }
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
 * { aclAuth: 'must'|'may' }
 * { aclDefault: 'must'|'may' }
 * @result {object} { err: [blocking errors], info: [non blocking anomalies]}
 */
const isValidAcl = async (itemUrl, aclContent, URI, options) => {
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
const isValidRDF = async (itemUrl, content) => {
  try {
    const res = await rdf.queryTurtle(itemUrl, content)
    return { err: [], info: [] }
  } catch (e) { return { err: ['incorrect RDF'], info: [e] } }
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

export default {
  isValidAcl,
  isValidRDF,
  aclMode,
  checkAcl
}
