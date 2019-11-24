import errorUtils from '../src/utils/errorUtils'

const {
  promisesSettled,
  awaitComposedFetch
} = errorUtils

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

describe('awaitComposedFetch', () => {
  test.todo('add test cases for awaitComposedFetch')
})