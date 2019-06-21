/**
 * Methods which make working with expect and api responses more convenient
 */
import { getPrefix, prefixes } from './contextSetup'

/**
 * @param {Promise<Response>} promise 
 * @param {number} status
 */
export function resolvesWithStatus(promise, status) {
    return expect(promise).resolves.toHaveProperty('status', status)
}

/**
 * @param {Promise<Response>} promise 
 * @param {number} status 
 */
export function rejectsWithStatus(promise, status) {
    return expect(promise).rejects.toHaveProperty('status', status)
}

/**
 * @param {Promise<Response>} promise
 * @param {string} name
 * @param {string} value
 */
export async function resolvesWithHeader(promise, name, value) {
    const response = await promise
    const header = response.headers.get(name)
    return expect(header).toMatch(value)
}

/**
 * @param {boolean} condition
 * @param {...any}
 */
export function testIf(condition, ...args) {
    if (condition) {
        return test(...args)
    }
    else {
        return test.skip(...args)
    }
}

/**
 * Run jest test only in the target environment
 * @param {string} prefix
 * @param  {...any} args 
 */
export function testIfEnvironment(prefix, ...args) {
    return testIf(getPrefix() === prefix, ...args)
}

/**
 * Run jest test only if in https:// test environment
 */
export function testIfHttps(...args) {
    return testIfEnvironment(prefixes.https, ...args)
}

/**
 * Run jest test only if in app://ls/ test environment
 */
export function testIfMemory(...args) {
    return testIfEnvironment(prefixes.memory, ...args)
}

/**
 * Run jest test only if in file:// test environment
 */
export function testIfFile(...args) {
    return testIfEnvironment(prefixes.file, ...args)
}