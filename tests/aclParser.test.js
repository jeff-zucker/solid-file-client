import SolidFileClient from '../src/index'

import TestFolderGenerator from './utils/TestFolderGenerator'
import contextSetupModule from './utils/contextSetup'
import errorUtils from '../src/utils/errorUtils'
import { rejectsWithStatuses, resolvesWithStatus, rejectsWithStatus } from './utils/jestUtils'

const { getAuth, getFetch, getTestContainer, contextSetup } = contextSetupModule
const { Folder, File, FolderPlaceholder, FilePlaceholder, BaseFolder } = TestFolderGenerator

const getRootUrl = url => {
  const base = url.split('/')
  let rootUrl = base[0]
  let j = 0
  for (let i = 1; i < base.length - 1; i++) {
    j = i
    if (base[i] === '') { rootUrl += '/' }
    break
  }
  rootUrl = rootUrl + '/' + base[j + 1] // + ('/')
  return rootUrl
}

/** @type {SolidApi} */
let api

const container = new BaseFolder(getTestContainer(), 'aclParser')

jest.setTimeout(30 * 1000)

beforeAll(async () => {
  await contextSetup()
//  api = new SolidApi(getFetch())
  api = new SolidFileClient(getAuth())
  await container.reset()
})

const host = 'https://example.org/'
const base = host + 'path/to/'

const defaultOnly = '    acl:default target:;\n'
const accessOnly = '    acl:accessTo target:;\n'
const defaultTarget = '    acl:accessTo target:;\n    acl:default target:;\n'
const inherit = 'Default'    

const prefix = test => `@prefix : <#>.
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix target: <${test}>.
`
const append = (webId, access, inherit='') => `:Append${inherit}
    a acl:Authorization;
${access}    acl:agent <${webId}me>;
    acl:origin <https://solid.community>;
    acl:mode acl:Append.
`
const appendDefault = (access) => `:AppendDefault
    a acl:Authorization;
${access}    acl:agentClass foaf:Agent;
    acl:mode acl:Append.
`
const read = (webId, access, inherit='') => `:Read${inherit}
    a acl:Authorization;
${access}    acl:agent <${webId}me>;
    acl:agent <https://test.solid.community/profile/card#me>;
    acl:mode acl:Read.
`
const readWrite = (access, inherit='') => `:ReadWrite${inherit}
    a acl:Authorization;
${access}    acl:agentClass acl:AuthenticatedAgent;
    acl:mode acl:Read, acl:Write.
`
// TODO
const readWriteControl = (access, inherit='') => `:ReadWriteControl${inherit}
    a acl:Authorization;
${access}    acl:agentClass foaf:Agent;
    acl:mode acl:Read, acl:Write, acl:Control.
`
const noMode = (access, inherit='') => `:Read${inherit}
    a acl:Authorization;
${access}    acl:agentClass foaf:Agent.
`
const acl0 = (test, webId, access, inherit) => {
    return prefix(test) + '\n' + read(webId, access, inherit) +'\n'+readWrite(access, inherit)+'\n'+readWriteControl(access, inherit)
}

const acl1 = (test, webId, access, inherit) => {
    return prefix(test) + '\n' + readWrite(access, inherit)+'\n'+readWriteControl(access, inherit)
}

const acl2 = (test, webId, access, inherit) => {
    return prefix(test) + '\n' + append(webId, access, inherit) +'\n'+readWrite(access, inherit)+'\n'+readWriteControl(access, inherit)
}

const acl3 = (test, webId, access, inherit) => {
    return prefix(test) + '\n' + read(webId, access, inherit) + '\n' + readWriteControl(access, inherit)
}

const acl4 = (test, webId, access, inherit) => {
    return prefix(test) + '\n' + read(webId, access, inherit) + '\n' + readWriteControl(access, inherit)
}

const acl5 = (test, webId, access1, access2, inherit) => {
  return prefix(test) + '\n' + readWriteControl(access2, '') + '\n' + read(webId, access1, inherit) + '\n' + appendDefault(access1)
}

const noRule = (test, webId, access, inherit) => {
  return prefix(test) + '\n' + noMode(access, inherit)
}

describe('aclParser', () => {
  test('users object for file', async () => {
    const content = acl0('file.ext', '/profile/card#', '', '')
    const users = await api.acl.contentParser(base+'file.ext', content)
    const keysUsers = ['agent&' + host + 'profile/card#me', 'agent&https://test.solid.community/profile/card#me', 'agentClass&AuthenticatedAgent', 'agentClass&Agent']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('users object for folder', async () => {
    const content = acl0('./', '/profile/card#', '', inherit)
    const users = await api.acl.contentParser(base, content)
    const keysUsers = ['agent&' + host + 'profile/card#me', 'agent&https://test.solid.community/profile/card#me','agentClass&AuthenticatedAgent', 'agentClass&Agent']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('create aclContent for file', async () => {
    const content = acl0('file.ext', '/profile/card#', accessOnly, '')
    const users = await api.acl.contentParser(base+'file.ext', content)
    const aclContent = await api.acl.createContent(base+'file.ext', users)
   expect(aclContent).toBe(content)
  })
  test('create aclContent for folder with an agent being in 2 authorization rules', async () => {
    const content = acl5('./', '/profile/card#', defaultOnly, accessOnly, inherit) // acl0('./', '/profile/card#', defaultTarget, '')
    const users = await api.acl.contentParser(base, content)
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(content)
  })
  test('remove mode Write from AuthenticatedAgent, create aclContent for folder', async () => {
    const content = acl0('./', '/profile/card#', defaultTarget, '')
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.deleteUserMode(users, [{ agentClass: 'AuthenticatedAgent'}], ['Read', 'Write'])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl3('./', '/profile/card#', defaultTarget, ''))
  })
  test('remove "agents", create aclContent for folder', async () => {
    const content = acl0('./', '/profile/card#', defaultTarget, inherit)
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.deleteUserMode(users, [{ agent: host + 'profile/card#me' }, { agent: 'https://test.solid.community/profile/card#me' }]) // { agentClass: 'Agent'}])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl1('./', '/profile/card#', defaultTarget, ''))
  })
  test('add "Append" to "agent" and "origin", create aclContent for folder', async () => {
    const content = acl1('./', '/profile/card#', defaultTarget, inherit)
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.addUserMode(users, [{ agent: host + 'profile/card#me' }, { origin: 'https://solid.community'}], ['Append'], ['accessTo', 'default'])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl2('./', '/profile/card#', defaultTarget, ''))
  })
  test('build acl for file from void content, accessTo by default', async () => {
    let users = await api.acl.addUserMode({}, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read']) // , ['accessTo'])
    users = await api.acl.addUserMode(users, [{ agentClass: 'Agent'}], ['Read', 'Write', 'Control'])
    const aclContent = await api.acl.createContent(base + 'file.ext', [users])
    expect(aclContent).toBe(acl4('file.ext', '/profile/card#', accessOnly, ''))
  })
  test('build acl for folder from void content, with "default" only to rule :Read', async () => {
    let users = await api.acl.addUserMode({}, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read'], ['default'])
      .then(async users => await api.acl.addUserMode(users, [{ agentClass: 'Agent'}], ['Read', 'Write', 'Control'], ['accessTo']))
    let users1 = await api.acl.addUserMode({}, [{ agentClass: 'Agent' }], ['Append'], ['default'])
    const aclContent = await api.acl.createContent(base, [users, users1])
    expect(aclContent).toBe(acl5('./', '/profile/card#', defaultOnly, accessOnly, inherit))
  })
  test('bad acl for folder no acl:control', async () => {
    let users = await api.acl.addUserMode({}, [{ agentClass: 'Agent'}], ['Read'])
      .then(async users => await api.acl.addUserMode(users, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read', 'Write'], ['accessTo']))
    return expect(api.acl.createContent(base, users)).rejects.toThrow('no acl:Control')
  })
  test('bad acl for folder no agent with control and acl:accessTo', async () => {
    let users = await api.acl.addUserMode({}, [{ agentClass: 'Agent'}], ['Read'])
      .then(async users => await api.acl.addUserMode(users, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read', 'Write', 'Control'], ['default']))
    return expect(api.acl.createContent(base, users)).rejects.toThrow('no agent with Control and acl:accessTo')
  })
})

describe('aclUrlParser', () => {

  const fileWithAcl = new File('child-file.txt', 'I am a child', 'text/plain', {
    acl: true,
    placeholder: { meta: true }
  }) // Note: Acl Content will be overriden by some tests
  const targetWithoutAcl = new File('target.txt', 'target', 'text/plain', {
  })
  const targetFolderWithAcl = new Folder('folder-with-acl', [], {
      acl: true, // Note: Content will be overriden by some tests
      placeholder: { meta: true }
  })

  const folder = new BaseFolder(container, 'aclUrlParser', [
      new Folder('nested', [
          targetFolderWithAcl,
          targetWithoutAcl
        ])
    ], {
      acl: true 
  })

  beforeEach(() => folder.reset())
  folder.acl.content = acl0('./', '/profile/card#', defaultTarget)

  test('get acl content for folder with acl', async () => {
    const users = await api.aclUrlParser(targetFolderWithAcl.url)
    const keysUsers = ['agent&' + getRootUrl(folder.url) + '/profile/card#me', 'agentClass&Agent']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('get acl content for folder without acl', async () => {
    const users = await api.aclUrlParser(folder.url+'nested/')
    const keysUsers = ['agent&' + getRootUrl(folder.url) + '/profile/card#me', 'agent&https://test.solid.community/profile/card#me', 'agentClass&AuthenticatedAgent', 'agentClass&Agent']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('get acl content for file without acl', async () => {
    const users = await api.aclUrlParser(targetWithoutAcl.url)
    const keysUsers = ['agent&' + getRootUrl(folder.url) + '/profile/card#me', 'agent&https://test.solid.community/profile/card#me', 'agentClass&AuthenticatedAgent', 'agentClass&Agent']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
})

describe('aclParser errors', () => {
  test('contentParser : error url = "" an url is needed', async () => {
    return expect(api.acl.contentParser('', '')).rejects.toThrow('an url is needed')
  })
  test('contentParser : error content "" is not an acl', async () => {
    return expect(api.acl.contentParser(base + 'file.ext', '')).rejects.toThrow('not an acl')
  })
  test('contentParser : error content is RDF and no acl predicate', async () => {
    return expect(api.acl.contentParser(base + 'file.ext', '<#> a <test>.')).rejects.toThrow('not an acl')
  })
  test('addUserMode : error no userMode', async () => {
    return expect(api.acl.addUserMode({}, [{ agentClass: 'Agent'}, { default: '' }])).rejects.toThrow('Parameters should be Arrays')
  })
  test('addUserMode : error no modes', async () => {
    return expect(api.acl.addUserMode({}, [{ agentClass: 'Agent'}, { default: '' }], [])).rejects.toThrow('no modes in userMode')
  })
  test('addUserMode : error unknown mode', async () => {
    return expect(api.acl.addUserMode({}, [{ agentClass: 'Agent'}, { default: '' }], ['read'])).rejects.toThrow('is an unknown mode')
  })
  test('addUserMode : error no agent', async () => {
    return expect(api.acl.addUserMode({}, [], ['Read'])).rejects.toThrow('no agent in userAgent')
  })
  test('addUserMode : error unknown acl: predicate', async () => {
    return expect(api.acl.addUserMode({}, [{ AGENTCLASS: 'Agent'}, { default: '' }], ['Read'])).rejects.toThrow('AGENTCLASS is not an agentType')
  })
  test('deleteUserMode : error no agent', async () => {
    return expect(api.acl.deleteUserMode({}, [], ['Read'])).rejects.toThrow('no agent in userAgent')
  })
  test('deleteUserMode : error parameters should be arrays', async () => {
    return expect(api.acl.deleteUserMode({}, [{ agentClass: 'Agent'}, { default: '' }], 'Read')).rejects.toThrow('Parameters should be Arrays')
  })
  test('aclCreate : error no agent', async () => {
    return expect(api.acl.createContent(base, {})).rejects.toThrow('there are no agents')
  })
  test('aclCreate : error no rule', async () => {
    const content = noRule('./', '/profile/card#', '')
    const users = await api.acl.contentParser(base, content)
    return expect(api.acl.createContent(base, users)).rejects.toThrow('there are no rules')
  })
}) 