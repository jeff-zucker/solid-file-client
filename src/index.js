import SolidFileClient from './SolidFileClient'
import errorUtils from './utils/errorUtils'

const { FetchError, ComposedFetchError } = errorUtils
SolidFileClient.FetchError = FetchError
SolidFileClient.ComposedFetchError = ComposedFetchError

export default SolidFileClient
