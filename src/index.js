// @flow
import solidAuth from 'solid-auth-client';
import { guessFileType, text2graph, folderType, processFolder, type FolderData } from './folderUtils';

export type { FolderData };

/* SOLID READ/WRITE FUNCTIONS
 */

/**
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
 * @param {string} url the location to put this folder
 */
export async function createFolder(url: string) {
  const response = await createFile(url, undefined, folderType);
  return response;
}

/**
 * @param {string} url the location of the folder to be deleted
 */
export async function deleteFile(url: string) {
  const response = await solidAuth.fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  return response;
}

/**
 * @param {string} url the location of the folder to be deleted
 */
export function deleteFolder(url: string) {
  return deleteFile(url);
}

/**
 * @param {string} url the url of the file to be updated
 * @param {*} content the request body
 */
export function updateFile<T>(url: string, content: T, contentType: string) {
  return deleteFile(url).then(() => createFile(url, content, contentType));
}

/**
 * @param {string} url
 * @param {Request} request
 */
export async function fetch(url: string, request?: Request): Promise<string> {
  const response = await solidAuth.fetch(url, request);
  if (!response.ok) throw new Error(`${response.status} (${response.statusText})`);
  return response.text();
}

/**
 * @param {string} url Location of the file to read.
 */
export function readFile(url: string) {
  return fetch(url);
}


/**
 * @param {string} url Location of the folder to read.
 */
export async function readFolder(url: string): Promise<FolderData> {
  const folderRDFText = await fetch(url);
  if (!folderRDFText) throw new Error(`No such folder at ${url}`);
  const graph = await text2graph(folderRDFText, url, 'text/turtle');
  return processFolder(graph, url, folderRDFText);
}

/**
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
 *
 */
export async function checkSession(): Promise<{ webId: string }> {
  const session = await solidAuth.currentSession();
  if (!session) {
    throw new Error('No session');
  }
  return session;
}

/**
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
