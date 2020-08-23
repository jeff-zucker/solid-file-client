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

const defaultTarget = '    n0:default target:;\n'    

const prefix = test => `@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix n1: <http://xmlns.com/foaf/0.1/>.
@prefix target: <${test}>.
`
const append = paramDefault => `:Append
    a n0:Authorization;
    n0:accessTo target:;
    n0:agentClass n1:Agent;
    n0:origin <https://solid.community>;
${paramDefault}    n0:mode n0:Append.
`
const read = paramDefault => `:Read
    a n0:Authorization;
    n0:accessTo target:;
    n0:agentClass n1:Agent;
${paramDefault}    n0:mode n0:Read.
`
const readWrite = paramDefault => `:ReadWrite
    a n0:Authorization;
    n0:accessTo target:;
    n0:agentClass n0:AuthenticatedAgent;
${paramDefault}    n0:mode n0:Read, n0:Write.
`

const readWriteControl = (webId, paramDefault) => `:ReadWriteControl
    a n0:Authorization;
    n0:accessTo target:;
    n0:agent <${webId}me>;
    n0:agent <https://test.solid.community/profile/card#me>;
${paramDefault}    n0:mode n0:Read, n0:Write, n0:Control.
`
const noMode = paramDefault => `:Read
    a n0:Authorization;
    n0:accessTo target:;
    n0:agentClass n1:Agent;
${paramDefault}.
`
const acl0 = (test, webId, paramDefault) => {
    return prefix(test) + '\n' + read(paramDefault) +'\n'+readWrite(paramDefault)+'\n'+readWriteControl(webId, paramDefault)
}

const acl1 = (test, webId, paramDefault) => {
    return prefix(test) + '\n' + readWrite(paramDefault)+'\n'+readWriteControl(webId, paramDefault)
}

const acl2 = (test, webId, paramDefault) => {
    return prefix(test) + '\n' + append(paramDefault) +'\n'+readWrite(paramDefault)+'\n'+readWriteControl(webId, paramDefault)
}

const acl3 = (test, webId, paramDefault) => {
    return prefix(test) + '\n' + read(paramDefault)+'\n'+readWriteControl(webId, paramDefault)
}

const acl4 = (test, webId, paramDefault) => {
    return prefix(test) + '\n' + read(paramDefault) + '\n' + readWriteControl(webId, '')
}

const noRule = (test, webId, paramDefault) => {
  return prefix(test) + '\n' + noMode(paramDefault)
}

describe('aclParser', () => {
  test('users object for file', async () => {
    const content = acl0('file.ext', '/profile/card#', '')
    const users = await api.acl.contentParser(base+'file.ext', content)
    const keysUsers = ['agentClass&Agent', 'agentClass&AuthenticatedAgent', 'agent&' + host + 'profile/card#me', 'agent&https://test.solid.community/profile/card#me']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('users object for folder', async () => {
    const content = acl0('./', '/profile/card#', '')
    const users = await api.acl.contentParser(base, content)
    const keysUsers = ['agentClass&Agent', 'agentClass&AuthenticatedAgent', 'agent&' + host + 'profile/card#me', 'agent&https://test.solid.community/profile/card#me']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('create aclContent for file', async () => {
    const content = acl0('file.ext', '/profile/card#', '')
    const users = await api.acl.contentParser(base+'file.ext', content)
    const aclContent = await api.acl.createContent(base+'file.ext', users)
    expect(aclContent).toBe(content) // acl0('file.ext','/profile/card#', ''))
  })
  test('create aclContent for folder', async () => {
    const content = acl0('./', '/profile/card#', defaultTarget)
    const users = await api.acl.contentParser(base, content)
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(content)
  })
  test('remove mode Write from AuthenticatedAgent, create aclContent for folder', async () => {
    const content = acl0('./', '/profile/card#', defaultTarget)
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.deleteUserMode(users, [{ agentClass: 'AuthenticatedAgent'}], ['Read', 'Write'])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl3('./', '/profile/card#', defaultTarget))
  })
  test('remove "everybody", create aclContent for folder', async () => {
    const content = acl0('./', '/profile/card#', defaultTarget)
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.deleteUserMode(users, [{ agentClass: 'Agent'}])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl1('./', '/profile/card#', defaultTarget))
  })
  test('add "Append" to "everybody" and "origin", create aclContent for folder', async () => {
    const content = acl1('./', '/profile/card#', defaultTarget)
    let users = await api.acl.contentParser(base, content)
    users = await api.acl.addUserMode(users, [{ agentClass: 'Agent'}, { origin: 'https://solid.community'}], ['Append'])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl2('./', '/profile/card#', defaultTarget))
  })
  test('build acl for file from void content', async () => {
    let users = await api.acl.addUserMode({}, [{ agentClass: 'Agent'}, { default: '' }], ['Read'])
    users = await api.acl.addUserMode(users, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read', 'Write', 'Control'])
    const aclContent = await api.acl.createContent(base + 'file.ext', users)
    expect(aclContent).toBe(acl4('file.ext', '/profile/card#', ''))
  })
  test('build acl for folder from void content, with "default" only to rule :Read', async () => {
    let users = await api.acl.addUserMode({}, [{ agentClass: 'Agent'}, { default: '' }], ['Read'])
    users = await api.acl.addUserMode(users, [{ agent: '/profile/card#me'}, { agent: 'https://test.solid.community/profile/card#me'}], ['Read', 'Write', 'Control'])
    const aclContent = await api.acl.createContent(base, users)
    expect(aclContent).toBe(acl4('./', '/profile/card#', defaultTarget))
  })
})

describe('aclUrlParser', () => {

  const fileWithAcl = new File('child-file.txt', 'I am a child', 'text/plain', {
    acl: true,
    placeholder: { meta: true }
  }) // Note: Acl Content will be overriden by some tests
  const targetWithAcl = new File('target.txt', 'target', 'text/plain', {
  })
  const targetFolderWithAcl = new Folder('folder-with-acl', [], {
      acl: true, // Note: Content will be overriden by some tests
      placeholder: { meta: true }
  })

  const folder = new BaseFolder(container, 'aclUrlParser', [
      new Folder('nested', [
          targetFolderWithAcl,
          targetWithAcl
        ])
    ], {
      acl: true 
  })

  beforeEach(() => folder.reset())
  folder.acl.content = acl0('./', '/profile/card#', defaultTarget)

  test('get acl content for folder', async () => {
    const users = await api.aclUrlParser(targetFolderWithAcl.url)
    const keysUsers = ['agentClass&Agent', 'agentClass&AuthenticatedAgent', 'agent&' + getRootUrl(folder.url) + '/profile/card#me', 'agent&https://test.solid.community/profile/card#me']
    const usersKeys = Object.keys(users)
    expect(usersKeys).toEqual(keysUsers)
  })
  test('get acl content for file', async () => {
    const users = await api.aclUrlParser(targetWithAcl.url)
    const keysUsers = ['agentClass&Agent', 'agentClass&AuthenticatedAgent', 'agent&' + getRootUrl(folder.url) + '/profile/card#me', 'agent&https://test.solid.community/profile/card#me']
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