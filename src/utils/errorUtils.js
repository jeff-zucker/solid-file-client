// Error classe for wrapping a single failed request as Error
// Should be wrapped inside a FetchError
class SingleResponseError extends Error {
  /**
   * @param {Response} response
   * @param  {...any} params
   */
  constructor (response, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    this.name = 'SingleResponseError'
    if (!params.length) { this.message = `${response.status} ${response.url}` } // Default message

    this.response = response
    this.ok = false
    this.status = response.status
    this.statusText = response.statusText
    this.url = response.url
  }
}

/**
 * @typedef FetchErrorData
 * @property {Response[]} [successful]
 * @property {SingleResponseError[]} [rejectedErrors]
 * @property {Error[]} [errors]
 */

class FetchError extends Error {
  /**
   *
   * @param {FetchErrorData} errorData
   * @param  {...any} params
   */
  constructor ({ successful = [], rejectedErrors = [], errors = [] }, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    this.name = 'SFCFetchError'

    this.successful = successful
    this.rejected = rejectedErrors.map(err => err.response)
    this.rejectedErrors = rejectedErrors
    this.errors = errors
    this.ok = false

    if (!rejectedErrors.length) {
      // Other errors
      this.message = `${this.name} ${errors.map(err => err.message).join('\n')}`
      this.status = -1
      this.statusText = this.message
    } else if (rejectedErrors.length === 1 && !errors.length) {
      // Single fetch error
      this.message = `${this.name} ${rejectedErrors[0].message}`
      this.status = rejectedErrors[0].status
      this.statusText = rejectedErrors[0].statusText
    } else {
      // Multiple Fetch and possibly other errors
      this.message = `${this.name} ${[...rejectedErrors, ...errors].map(err => err.message).join('\n')}`
      this.status = -2
      this.statusText = this.message
    }

    // Custom debugging information
    this.successful = successful
    this.rejected = rejectedErrors.map(err => err.response)
    this.rejectedErrors = rejectedErrors
    this.errors = errors
  }
}

const defaultErrorDescriptions = {
  401: 'Make sure that the user is properly logged in',
  403: 'Make sure that the origin of your app is authorized for your pod',
  404: 'The requested resource could not be found',
  409: 'A conflict appeared. If you tried to delete a folder, make sure that it is empty',
  500: 'An internal server error occured'
}

/**
 * Throw response if response.ok is set to false
 * @param {Response} res
 * @returns {Response} same response
 * @throws {FetchError}
 */
function assertResponseOk (res) {
  if (!res.ok) {
    const fetchErr = (res.status in defaultErrorDescriptions)
      ? new SingleResponseError(res, `${res.status} ${res.url} - ${defaultErrorDescriptions[res.status]}`)
      : new SingleResponseError(res)

    throw new FetchError({ successful: [], rejectedErrors: [fetchErr] })
  }
  return res
}

/**
 * @typedef {object} SettledPromise
 * @property {("fulfilled"|"rejected")} status
 * @property {any} [value] defined if the promise resolved
 * @property {any} [reason] defined if the promise rejected
 */

/**
 * Wait for all promises to settle before resolving with a list of settled promises
 * @param {Promise<any>[]} promises
 * @returns {Promise<SettledPromise[]>}
 */
async function promisesSettled (promises) {
  const reflectedPromises = promises.map(promise => {
    return promise
      .then(value => { return { status: 'fulfilled', value } })
      .catch(reason => { return { status: 'rejected', reason } })
  })
  return Promise.all(reflectedPromises)
}

/**
 * Wait for all promises to settle and then return an array of the responses on success.
 * If an error occured create a FetchError with all rejected promises
 * @param {Promise<Response|Response[]>[]} promises
 * @returns {Response[]}
 * @throws {FetchError}
 */
async function composedFetch (promises) {
  const res = await promisesSettled(promises)

  /** @type {Response[]} */
  const successful = [].concat(...res.filter(({ status }) => status === 'fulfilled').map(({ value }) => value))
  /** @type {FetchError[]} */
  const rejectedPromises = res.filter(({ status }) => status === 'rejected').map(({ reason }) => reason)

  if (rejectedPromises.length) {
    const errors = [].concat(...rejectedPromises.map(err => err.errors))
    const rejectedErrors = [].concat(...rejectedPromises.map(err => err.rejectedErrors))

    throw new FetchError({ successful, rejectedErrors, errors })
  }

  return successful
}

/**
 * Convert some kind of error to a FetchError and rethrow it
 * @param {Error|SingleResponseError|FetchError} err
 * @throws {FetchError}
 * @returns {Response} It never returns. This is only for JSDoc
 */
function toFetchError (err) {
  if (err instanceof FetchError) {
    throw err
  } else if (err instanceof SingleResponseError) {
    throw new FetchError({ rejectedErrors: [err] })
  } else if (err instanceof Error) {
    throw new FetchError({ errors: [err] })
  } else {
    throw err
  }
}

export default {
  FetchError,
  SingleResponseError,
  assertResponseOk,
  composedFetch,
  promisesSettled,
  toFetchError
}
