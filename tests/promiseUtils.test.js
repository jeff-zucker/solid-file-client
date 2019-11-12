import promiseUtils from '../src/utils/promiseUtils'

const {
  promiseAllWithErrors,
  promisesSettled
} = promiseUtils

describe('promisesSettled', () => {
  test('resolves when all promises resolve', () => {
    return expect(promisesSettled([Promise.resolve(1), Promise.resolve(2)])).resolves.toBeDefined()
  })
  test('resolves when all promises reject', () => {
    return expect(promisesSettled([Promise.reject(1), Promise.reject(2)])).resolves.toBeDefined()
  })
  test('resolves with array containing objects', async () => {
    const res = await promisesSettled([
      Promise.resolve('success'),
      Promise.reject('error')
    ])
    expect(res).toHaveLength(2)
    expect(res[0]).toHaveProperty('status', 'fulfilled')
    expect(res[0]).toHaveProperty('value', 'success')
    expect(res[1]).toHaveProperty('status', 'rejected')
    expect(res[1]).toHaveProperty('reason', 'error')
  })
})

describe('promiseAllWithErrors', () => {
  test('resolves when all promises resolve', () => {
    return expect(promiseAllWithErrors([Promise.resolve(1), Promise.resolve(2)])).resolves.toBeDefined()
  })
  test('rejects when all promises reject', () => {
    return expect(promiseAllWithErrors([Promise.reject(1), Promise.reject(2)])).rejects.toBeDefined()
  })
  test('resolves with values', async () => {
    const res = await promiseAllWithErrors([
      Promise.resolve(1),
      Promise.resolve(2)
    ])
    expect(res).toEqual(expect.arrayContaining([1, 2]))
  })
  test('rejects with reasons', async () => {
    expect(promiseAllWithErrors([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.reject('err1'),
        Promise.reject('err2')
      ])
    ).rejects.toEqual(expect.arrayContaining(['err1', 'err2']))
  })
})