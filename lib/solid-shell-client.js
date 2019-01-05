/* a light layer on top of solid-cli, giving it persistant 
 * sessions and making it conform to the same API as 
 * solid-auth-client
 */

"use strict";

import * as ifetch          from 'isomorphic-fetch';
import * as SolidClient     from '@solid/cli/src/SolidClient';
import * as IdentityManager from '@solid/cli/src/IdentityManager';

// cjs-start
/*
const ifetch          = require('isomorphic-fetch');
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager =require('@solid/cli/src/IdentityManager');
exports.fetch = fetch;
exports.currentSession = currentSession;
exports.login = login;
exports.logout = logout;
*/
// cjs-end

let session;
const idMan = new IdentityManager()
const client = new SolidClient({ identityManager : new IdentityManager() });

/*  TBD: make fetch a two-step request like solid-auth-client
 *  check if authorization needed and only send token if it its
 */
export async function fetch(url,request){
    request = request || {};
    request.method = request.method || 'GET';
    request.headers = request.headers || {};
    if( session ) {
         let token = await client.createToken(url, session);
         request.credentials = "include";
         request.headers.authorization= `Bearer ${token}`;
    }
    return await ifetch(url,request);
}
/* 
 *  RATHER MINIMAL, BUT FOR NOW THEY"LL DO
 */
export async function logout() {
    session = undefined;    
    return(1);
}
export async function currentSession(){
    return(session)
}
export async function login( { idp, username, password } ) {
    session = await client.login(idp,{username,password});
    session.webID = session.idClaims.sub
    return session;
}

