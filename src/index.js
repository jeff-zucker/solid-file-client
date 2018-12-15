// @flow
import solidAuth from 'solid-auth-client';
import { guessFileType, text2graph, folderType, processFolder, type FolderData } from './folderUtils';

export type { FolderData };

/* SOLID READ/WRITE FUNCTIONS
 */

/**
 * Add an item to a folder
 * @param {string} parentFolder URL of parent folder
 * @param {string} url suggested URL for new content
 * @param {*} content the request body
 * @param {string} contentType Content-Type of the request
 */
export async function add<T>(parentFolder: string, url: string, content: T, contentType: string) {
  let link = '<http://www.w3.org/ns/ldp#Resource>; rel="type"';
  if (contentType === folderType) {
    link = '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"';
    contentType = 'text/turtle';
  }
  const request = {
    method: 'POST',
    headers: { 'Content-Type': contentType, slug: url, link },
    body: content,
  };

  const response = await solidAuth.fetch(parentFolder, request);
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  return response;
}

/**
 * This method creates a new empty file.
 * The contentType should be specified either in the URL's extension or in the contentType parameter, but not both.
 *
 * NOTE : if the file already exists, the solid.community server (and others) will create an additional file with a prepended numerical ID so if you don't want that to happen, use updateFile() which will first delete the file if it exists, and then add the new file.
 * @param {string} url the location to put this file
 * @param {*} content the request body
 * @param {string} contentType Content-Type of the request
 */
export async function createFile<T>(url: string, content: T, contentType: string) {
  // remove file extension name
  const newThing = url.replace(/\/$/, '').replace(/.*\//, '');
  const parentFolder = url.replace(newThing, '').replace(/\/\/$/, '/');
  const response = await add(parentFolder, newThing, content, contentType);
  return response;
}

/**
 * This method creates a new empty folder at given URL.
 * @param {string} url the location to put this folder
 */
export async function createFolder(url: string) {
  const response = await createFile(url, undefined, folderType);
  return response;
}

/**
 * Delete a folder at given URL.
 * 
 * Attempting to delete a non-empty folder will fail with a "409 Conflict"
error.
 * @param {string} url the location of the folder to be deleted
 */
export async function deleteFile(url: string) {
  const response = await solidAuth.fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  return response;
}

/**
 * Delete a file at given URL.
 * @param {string} url the location of the folder to be deleted
 */
export function deleteFolder(url: string) {
  return deleteFile(url);
}

/**
 * Update the content of a file.
 *
 * NOTE : this is a file-level update, it replaces the file with the new content by removing the old version of the file and adding the new one.
 * @param {string} url the url of the file to be updated
 * @param {*} content the request body
 */
export function updateFile<T>(url: string, content: T, contentType: string) {
  return deleteFile(url).then(() => createFile(url, content, contentType));
}

/**
 * Fetch a RUL.
 *
 * Results will be empty on failure to fetch and on success results.value will hold the raw text of the resource. It may be called with a simple URL parameter or with a full request object which specifies method, headers, etc.
 *
 * This is a pass-through to solid-auth-client.fetch() providing some error trapping to make it consistent with the solid-file-client interface but otherwise, see the solid-auth-client docs and the Solid REST spec for details.
 * @param {string} url
 * @param {Request} request
 */
export async function fetch(url: string, request?: Request): Promise<string> {
  const response = await solidAuth.fetch(url, request);
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  return response.text();
}

/**
 * Read the content of a file at given URL.
 *
 * In the case of a successful fetch of an empty file, the response will be true but the response.value will be empty. This means that any true response can be interpreted as "this file exists" and you need to check response.value for its content, if any.
 * @param {string} url Location of the file to read.
 */
export function readFile(url: string) {
  return fetch(url);
}


/**
 * Read files and sub-folders of a folder.
 * @param {string} url Location of the folder to read.
 */
export async function readFolder(url: string): Promise<FolderData> {
  const folderRDFText = await fetch(url);
  if (!folderRDFText) throw new Error(`No such folder at ${url}`);
  const graph = await text2graph(folderRDFText, url, 'text/turtle');
  return processFolder(graph, url, folderRDFText);
}

/**
 * Parse the resource at a given URL.
 *
 * If the content-type is omitted, it will be guessed from the file extension. If the content-type is (or is guessed to be) 'text/turtle' or any other format that rdflib can parse, the response will be parsed by rdflib and returned as an rdflib graph object. If the content-type is 'application/json' the response will be a JSON object.
 * @param {string} url suggested URL for new content
 * @param {string} contentType Content-Type of the request
 */
export async function fetchAndParse(url: string, contentType: string = guessFileType(url)) {
  const response = await solidAuth.fetch(url);
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  if (contentType === 'application/json') return response.json();
  return text2graph(await response.text(), url, contentType);
}

/* SESSION MANAGEMENT
 */

/**
 * Get current session or reject.
 */
export async function checkSession(): Promise<{ webId: string }> {
  const session = await solidAuth.currentSession();
  if (!session) {
    throw new Error('No session');
  }
  return session;
}

/**
 * Get current session. If failed, try to get session by a login popup.
 *
 * Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community') on a redirected page and returns to wherever it was called from.
 * @param {string} popupUri URI of login popup provider
 */
export async function popupLogin(
  popupUri: string = 'https://solid.community/common/popup.html',
): Promise<{ webId: string }> {
  let session = await solidAuth.currentSession();
  if (!session) {
    session = await solidAuth.popupLogin({ popupUri });
  }
  return session;
}

/**
 * Get current session. If failed, try to get session by a redirect.
 *
 * Logs in to the specified IDP (Identity Provider, e.g. 'https://solid.community').
 * Be aware that this will redirect the user away from your application to their identity provider. When they return, currentSession() will return their login information.
 * @param {string} idp
 */
export async function login(idp: string) {
  const session = await solidAuth.currentSession();
  if (!session) await solidAuth.login(idp);
  else return session;
}
export function logout(): Promise<> {
  return solidAuth.logout();
}
