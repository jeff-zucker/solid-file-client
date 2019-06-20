/**
 * Methods which make working with expect and api responses more convenient
 */

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
