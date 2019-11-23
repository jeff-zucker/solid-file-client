import SolidFileClient from '../src'

const session = { webId: 'me' }
const credentials = { todo: 'make this more realistic' }
const defaultPopupUri = 'https://solid.community/common/popup.html'

const mocks = {
    login: jest.fn(),
    logout: jest.fn(),
    currentSession: jest.fn(),
    popupLogin: jest.fn(),
    getCredentials: jest.fn()
}

const auth = {}
let fileClient

// Reset fileClient and auth before each test
beforeEach(() => {
    auth.fetch = () => { throw new Error('Unexpected api call') }
    Object.entries(mocks).forEach(([key, mockFunc]) => {
        mockFunc.mockReset()
        auth[key] = mockFunc
    })
    fileClient = new SolidFileClient(auth)
})

describe('login', () => {
    test('login returns current session if available', async () => {
        mocks.currentSession.mockResolvedValueOnce(session)
        await expect(fileClient.login()).resolves.toBe(session.webId)
    })
    test('login calls login if no session available', async () => {
        mocks.currentSession.mockResolvedValueOnce(null)
        mocks.login.mockResolvedValueOnce(session)
        await expect(fileClient.login(credentials)).resolves.toBe(session.webId)
        expect(mocks.currentSession).toHaveBeenCalled()
        expect(mocks.login).toHaveBeenCalledWith(credentials)
    })
    test.todo('test behaviour for a failed login')
})

describe('popupLogin', () => {
    test('popupLogin returns current session if available', async () => {
        mocks.currentSession.mockResolvedValueOnce(session)
        await expect(fileClient.popupLogin()).resolves.toBe(session.webId)
    })

    test('popupLogin uses login if window is undefined', async () => {
        mocks.login.mockResolvedValueOnce(session)
        await expect(fileClient.popupLogin()).resolves.toBe(session.webId)
        // TBD: Should login be called with the popupUri?
        expect(mocks.login).toHaveBeenCalledWith(defaultPopupUri)
    })

    test.skip('popupLogin uses login if window is available', async () => {
        // Note: If you know how to define window for one specific test case, please do this here :)
        mocks.popupLogin.mockResolvedValueOnce(session)
        await expect(fileClient.popupLogin()).resolves.toBe(session.webId)
        expect(mocks.login).toHaveBeenCalledWith({ popupUri: defaultPopupUri })
    })
})

describe('logout', () => {
    test('logout forwards to mock logout', async () => {
        mocks.logout.mockResolvedValueOnce(Promise.resolve())
        await expect(fileClient.logout()).resolves.toBe()
        expect(mocks.logout).toHaveBeenCalled()
    })
})

describe('checkSession', () => {
    test('returns webId if logged in', async () => {
        mocks.currentSession.mockResolvedValueOnce(session)
        await expect(fileClient.checkSession()).resolves.toBe(session.webId)
        expect(mocks.currentSession).toHaveBeenCalled()
    })
    test('returns undefined if not logged in', async () => {
        mocks.currentSession.mockResolvedValueOnce()
        await expect(fileClient.checkSession()).resolves.not.toBeDefined()
        expect(mocks.currentSession).toHaveBeenCalled()
    })
})

describe('currentSession', () => {
    test('currentSession forwards to mock', async () => {
        mocks.currentSession.mockResolvedValueOnce(session)
        await expect(fileClient.currentSession()).resolves.toBe(session)
        expect(mocks.currentSession).toHaveBeenCalled()
    })
})

describe('getCredentials', () => {
    test('getCredentials forwards to mock', async () => {
        mocks.getCredentials.mockReturnValueOnce(credentials)
        expect(fileClient.getCredentials()).toBe(credentials)
        expect(mocks.getCredentials).toHaveBeenCalled()
    })
})

describe('trackSession', () => {
    test.todo('Add test for this when it is implemented')
})