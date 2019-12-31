import SolidFileClient from './SolidFileClient'
import { MERGE, LINKS } from './SolidApi'
import errorUtils from './utils/errorUtils'

// Consider adding these as static properties to SolidApi
const { FetchError, SingleResponseError } = errorUtils
SolidFileClient.FetchError = FetchError
SolidFileClient.SingleResponseError = SingleResponseError
SolidFileClient.LINKS = LINKS
SolidFileClient.MERGE = MERGE

export default SolidFileClient
