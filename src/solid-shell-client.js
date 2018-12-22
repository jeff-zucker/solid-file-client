let session;
const client = getClient();
const ifetch = require('isomorphic-fetch');

exports.fetch = fetch;
exports.currentSession = currentSession;
exports.login = login;
exports.logout = logout;

async function zzzfetch(url,options){
    return new Promise((resolve, reject)=>{
        do_fetch(url,options).then( (result) => {
resolve(result);
//            if(typeof(result)!="undefined" && result[0]) resolve(result[1]);
//            else reject(result[1]);
        },err=>reject(err));
    });
}

async function fetch(url,options){
    let host = url.replace(/https:\/\//,'').replace(/\/.*$/,'');
    let path = url.replace(host,'').replace(/https:\/\//,'')
    options = options || {};
    options.hostname = host;
    options.path = path;
    options.method = options.method || 'GET';
    options.headers = options.headers || {};
    if( session ) {
         let token = await client.createToken(url, session);
         options.credentials = "include";
         options.headers.authorization= `Bearer ${token}`;
    }
    return await ifetch(url,options);
}
function getClient() {
    let SolidClient= require('@solid/cli/src/SolidClient');
    let IdManager  = require('@solid/cli/src/IdentityManager');
    let identityManager = new IdManager();
    return new SolidClient({ identityManager });
}
/* 
 * RATHER MINIMAL, BUT FOR NOW THEY"LL DO
*/
async function logout() {
    session = undefined;    
    return(1);
}
async function currentSession(){
    return(session)
}
async function login( { idp, username, password } ) {
    session = await client.login(idp,{username,password});
    session.webID = session.idClaims.sub
    return session;
}

