import apiUtils from './apiUtils'
import errorUtils from './errorUtils'
import RdfQuery from './rdf-query'

const { getRootUrl } = apiUtils
const { toFetchError } = errorUtils
const rdf = new RdfQuery()

/**
 * Check that .acl or .meta content of itemUrl is valid.
 * URI is usually the webId checked to have 'Control' authorization
 * 'notStrict' optional acl: Authorization, obligation acl: default for folder
 * 'strictAuth' obligation acl: Authorization and acl: Default
 * 'strict' : spec compliant obligation acl: Authorization, optional acl: default for folder
 *
 * @param {string} itemUrl
 * @param {string} content
 * @param {string} URI
 * @param {object} options
 * { aclValid: 'notStrict'|'strict' }
 * { aclInherit: 'must'|'may' }
 * @result {object} { err: [blocking errors], info: [non blocking anomalies]}
 */
const isValidTtl = async (itemUrl, content, URI, options) => {
  options = {
    aclAuth: 'Control',
    aclValid: 'strict',
    aclInherit: 'must',
    ...options
  }

  // is valid acl
  var isValidTtl = { err: [], info: [] }
  if (itemUrl.endsWith('.acl')) {
    isValidTtl = await isValidAcl(itemUrl, content, URI, options)
    // is relative notation
    if (content.includes(itemUrl.split('.acl')[0]) || content.includes(`${getRootUrl(itemUrl)}profile/card#`)) {
      isValidTtl.info = isValidTtl.info.concat(['you could use relative notation'])
    }

  // is valid ttl
  } else {
    isValidTtl = await isValidRDF(itemUrl, content)
  }
  return isValidTtl
}

/**
 * URI can be any valid Agent (person, group, software Bot)
 * check that URI or Public has control and that the acl is well-formed
 */
const isValidAcl = async (aclUrl, aclContent, URI, options) => {
  options = {
    aclAuth: 'Control',
    aclValid: 'strict',
    aclInherit: 'must',
    ...options
  }
  // acl content for URI or public (authorization, Control, accessTo)
  // groups are not checked for 'Control'
  try {
    // check if URI has control (use of aclAgent() or aclControl())
    rdf.setPrefix('URI', URI)
    const resAcl = await checkAcl(aclUrl, aclContent, options)
    if (resAcl.err === ['incorrect RDF']) return resAcl
    const resMode = await aclMode(aclUrl, aclContent, null, null, { URI: '' }, options)
    return {
      err: resAcl.err.concat(resMode.err),
      info: resAcl.info.concat(resMode.info)
    }
  } catch (err) { throw toFetchError(new Error(`isValidAcl ${err}`)) }
}

/**
 * is valid RDF
 * @param {string} itemUrl
 * @param {string} content
 */
const isValidRDF = async (itemUrl, content) => {
  try {
    await rdf.queryTurtle(itemUrl, content)
    return { err: [], info: [] }
  } catch (e) { return { err: ['incorrect RDF'], info: [e] } }
}

/**
 * Check if a user or everybody has an auth
 *
 * @param {string} aclUrl
 * @param {string} aclContent
 * @param {object} s to check a specific block ( null for all]
 * @param {object} p to check a specific agent type (null for all)
 * @param {object} o URI of person, group, bot, trusted app, ....
 * @param {object} options { aclAuth: 'Control' } by default
*/
const aclMode = async (aclUrl, aclContent, s, p, o, options) => {
  options = {
    aclAuth: 'Control',
    ...options
  }

  const res = { err: [], info: [] }
  try {
    // find acl blocks with 'auth' ('Control' ('write' may be enough with atomic delete))
    const aclMode = await rdf.queryTurtle(aclUrl, aclContent, s, { acl: 'mode' }, { acl: options.aclAuth })
    if (!aclMode.length) { res.err = [`no acl: ${options.aclAuth}`]; return res }

    for (const i in aclMode) {
      const aclItem = aclMode[i].subject.value
      rdf.setPrefix('aclItem', aclItem)
      // check if agent or everybody has 'auth'
      const aclAgent = await rdf.query(aclUrl, { aclItem: '' }, p, o)
      if (!aclAgent.length) {
        const aclPublic = await rdf.query(aclUrl, { aclItem: '' }, { acl: 'agentClass' }, null)
        res.err = aclPublic.length ? [] : [`noAgent with ${options.aclAuth}`]
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
 * @param {string} aclUrl
 * @param {string} aclContent
 * @param {object} options
 */
const checkAcl = async (aclUrl, aclContent, options) => {
  options = {
    aclValid: 'strict',
    aclInherit: 'must',
    ...options
  }

  let resType
  const res = { err: [], info: [] }
  const aclParent = aclUrl.split('.acl')[0]

  try {
    // load aclContent in store
    const acl = await rdf.queryTurtle(aclUrl, aclContent)
    if (!acl.length) return { err: [`not an aclFile : aclContent : ${aclContent}`], info: [] }

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
      resType = options.aclValid === 'strict' ? 'err' : 'info'
      const aclAuthorization = await rdf.query(aclUrl, { aclSubj: '' }, null, { acl: 'Authorization' })
      if (!aclAuthorization.length) res[resType] = res[resType].concat([`"${aclItem.split('#')[1]}" has no acl:Authorization`])

      // check for users
      const aclAgent = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'agent' }, null)
      const aclAgentClass = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'agentClass' }, null)
      const aclAgentGroup = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'agentGroup' }, null)
      if ((aclAgent.length + aclAgentClass.length + aclAgentGroup) === '0') res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no user`])

      // check for accessTo
      const aclAccessTo = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'accessTo' }, null)
      if (!aclAccessTo.length) {
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no accessTo`])
      } else if (aclAccessTo[0].object.value !== aclParent) {
        res.err = res.err.concat([`"${aclItem.split('#')[1]}" has invalid acl:accessTo URI`])
      }
      // check for acl:mode
      const aclMode = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'mode' }, null)
      if (!aclMode.length) res.err = res.err.concat([`"${aclItem.split('#')[1]}" has no acl:mode`])

      // for folder check for acl: 'default', a blocking error except for strict
      resType = options.aclInherit === 'must' ? 'err' : 'info'
      if (aclUrl.endsWith('/.acl')) {
        const aclDefault = await rdf.query(aclUrl, { aclSubj: '' }, { acl: 'default' }, null)
        if (!aclDefault.length) {
          res[resType] = res[resType].concat([`${aclItem.split('#')[1]} has no acl:default - you cannot inherit`])
        } else if (aclDefault[0].object.value !== aclParent) {
          res.err = res.err.concat([`${aclItem.split('#')[1]} acl:default has a wrong URI`])
        }
      }
    }
    return res
  } catch (err) {
    res.err = res.err.concat(['incorrect RDF ' + err])
    return res
  }
}

export default {
  isValidTtl,
  isValidAcl,
  isValidRDF,
  aclMode,
  checkAcl
}
