import SolidFileClient from './SolidFileClient'
import libraries from './libraries'

export default SolidFileClient
SolidFileClient.setRdflib = rdflib => { libraries.rdflib = rdflib }