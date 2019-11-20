/**
 * @typedef {object} SettledPromise
 * @property {("fulfilled"|"rejected")} status 
 * @property {any} [value] Defined if the promise resolved
 * @property {any} [reason] defined if the promise rejected
 */

/**
 * 
 * @param {Promise<any>[]} promises 
 * @returns {Promise<SettledPromise[]>}
 */
async function promisesSettled(promises) {
    const reflectedPromises = promises.map(promise => {
        return promise
            .then(value => { return { status: 'fulfilled', value } })
            .catch(reason => { return { status: 'rejected', reason } })
    })
    return Promise.all(reflectedPromises)
}

/**
 * Wait for all promises to finish and then reject with the rejected ones
 * or resolve with the fulfilled ones
 * @param {Promise<any>[]} promises 
 * @returns {Promise<any>[]} resolved values of the promises
 * @throws {any[]} reasons of the rejected promises
 */
async function promiseAllWithErrors(promises) {
    const res = await promisesSettled(promises)
    const errors = res.filter(({ status }) => status === 'rejected').map(({ reason }) => reason)
    if (errors.length)
        throw errors
    return res.filter(({ status }) => status === 'fulfilled').map(({ value }) => value)
}

/**
 * Wait for all promises to finish. 
 * If one or more rejects, create a flattened array of the errors and reject with it. 
 * Else resolve with an array of the fulfilled ones
 * @param {Promise<any>[]} promises
 * @returns {Promise<any>[]} resolved values of the promises
 * @throws {any[]} reasons of the rejected promises
 */
async function promiseAllWithFlattenedErrors(promises) {
    return promiseAllWithErrors(promises)
        .catch(errors => { throw [].concat(...errors) })
}

export default {
    promiseAllWithErrors,
    promisesSettled,
    promiseAllWithFlattenedErrors
}