import SolidFileClient from './SolidFileClient'
import errorUtils from './utils/errorUtils'

const { FetchError, SingleResponseError } = errorUtils
SolidFileClient.FetchError = FetchError
SolidFileClient.SingleResponseError = SingleResponseError

export default SolidFileClient
