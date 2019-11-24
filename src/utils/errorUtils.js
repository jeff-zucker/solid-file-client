class FetchError extends Error {
  /**
   * @param {Response} response 
   * @param  {...any} params 
   */
  constructor(response, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    this.name = 'FetchError'
    if (!params.length)
      this.message = `${this.name} ${response.status} ${response.url}` // Default message

    // Custom debugging information
    this.response = response
  }
}

/**
 * @typedef ComposedFetchResponses
 * @property {Response[]} successful
 * @property {Response[]} rejected
 * @property {FetchError[]} rejectedErrors
 */

class ComposedFetchError extends Error {
  /**
   * 
   * @param {ComposedFetchResponses} errorData 
   * @param  {...any} params 
   */
  constructor({ successful, rejectedErrors }, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    this.name = 'ComposedFetchError'
    if (!params.length) {
      // No explicit error message provided
      if (rejectedErrors.length === 1) {
        this.message = rejectedErrors[0].message
      } else {
        this.message = `${this.name} ${rejectedErrors.map(err => err.message).join('\n')}`
      }
    }

    // Custom debugging information
    this.successful = successful
    this.rejected = rejectedErrors.map(err => err.response)
    this.rejectedErrors = rejectedErrors
  }
}

const defaultErrorDescriptions = {
  401: 'Make sure that the user is properly logged in',
  403: 'Make sure that the user has access to the resource',
  404: 'The requested resource could not be found',
  409: 'A conflict appeared. If you tried to delete a folder, make sure that it is empty',
  500: 'An internal server error occured'
}

/**
 * Throw response if response.ok is set to false
 * @param {Response} res
 * @returns {Response} same response
 * @throws {Response}
 */
function assertResponseOk (res) {
  if (!res.ok) {
    const fetchErr = (res.status in defaultErrorDescriptions) ?
      new FetchError(res, `${res.status} ${res.url} - ${defaultErrorDescriptions[res.status]}`)
      : new FetchError(res)

    throw new ComposedFetchError({ successful: [], rejectedErrors: [ fetchErr ] })
  }
  return res
}

/**
 * @typedef {object} SettledPromise
 * @property {("fulfilled"|"rejected")} status 
 * @property {any} [value] Defined if the promise resolved
 * @property {any} [reason] defined if the promise rejected
 */

/**
 * Wait for all promises to settle before resolving with a list of settled promises
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
 * Wait for all promises to settle and then return an array of the responses on success.
 * If an error occured create a ComposedFetchError with all rejected promises
 * @param {Promise<Response|Response[]>[]} promises
 * @returns {Response[]}
 * @throws {ComposedFetchError}
 */
async function composedFetch(promises) {
  const res = await promisesSettled(promises)

  /** @type {Response[]} */
  const successful = [].concat(...res.filter(({ status }) => status === 'fulfilled').map(({ value }) => value))
  /** @type {ComposedFetchError[]} */
  const rejectedErrors = res.filter(({ status }) => status === 'rejected').map(({ reason }) => reason)

  if (rejectedErrors.length) {
    // Merge messages of all elements without rejectedErrors to prevent loosing them
    const errorsWithoutResponse = []
    const errors = []
    rejectedErrors.forEach(err => {
      if (!err.rejectedErrors || !err.rejectedErrors.length) {
        errorsWithoutResponse.push(err)
      } else {
        successful.push(...err.successful)
        errors.push(...err.rejectedErrors)
      }
    })

    if (errorsWithoutResponse.length) {
      const msg = errorsWithoutResponse.map(err => err.message).join('\n')
      throw new ComposedFetchError({ successful, rejectedErrors: errors }, msg)
    } else {
      throw new ComposedFetchError({ successful, rejectedErrors: errors })
    }
  }

  return successful
}

/**
 * Convert a FetchError to a ComposedFetchError and rethrow it
 * @param {Error} err 
 * @throws {ComposedFetchError}
 */
function toComposedError(err) {
  if (err instanceof ComposedFetchError) {
    throw err
  } else if (err instanceof FetchError) {
    throw new ComposedFetchError({ successful: [], rejectedErrors: [ err ]}, err.message)
  } else if (err instanceof Error) {
    throw new ComposedFetchError({ successful: [], rejectedErrors: [] }, err.message)
  } else {
    throw err
  }
}

export default {
  FetchError,
  ComposedFetchError,
  assertResponseOk,
  composedFetch,
  promisesSettled,
  toComposedError
}