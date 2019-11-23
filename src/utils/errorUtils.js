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
    if (!params.length)
      this.message = this.name + rejectedErrors.map(err => err.message).join('\n') // Default message

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
    if (res.status in defaultErrorDescriptions)
      throw new FetchError(res, `${res.status} ${res.url} - ${defaultErrorDescriptions[res.status]}`)
    throw new FetchError(res)
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
 * @param {Promise<Response|Response[]>[]} promises
 * @returns {Response[]}
 * @throws {ComposedFetchError}
 */
async function awaitComposedFetch(promises) {
  const res = await promisesSettled(promises)

  /** @type {Response[]} */
  const successful = []
  /** @type {FetchError[]} */
  const rejectedErrors = []

  res.forEach(settled => {
    if (settled.status === 'fulfilled') {
      successful.push(settled.value)
    } else if (settled.status === 'rejected') {
      const err = settled.reason
      if (err instanceof ComposedFetchError) {
        rejectedErrors.push(...err.rejectedErrors)
      } else if (err instanceof FetchError) {
        rejectedErrors.push(err)
      } else {
        // Unexpected Error
        throw err
      }
    }
  })

  // Throw when at least one error occurred
  if (rejectedErrors.length) {
    console.log('throwing ComposedFetchError')
    throw new ComposedFetchError({ successful, rejectedErrors })
  }

  return successful
}

export default {
  FetchError,
  ComposedFetchError,
  assertResponseOk,
  awaitComposedFetch,
  promisesSettled
}