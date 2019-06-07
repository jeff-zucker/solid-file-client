// Storage for libraries provided by the user

export default {
    set rdflib(rdflib) {
        this._rdflib = rdflib
    },
    get rdflib() {
        if (!this._rdflib) {
            throw new Error('Tried to access rdflib but it wasn\'t set. Please set it before using the api')
        }
        return this._rdflib
    },
}