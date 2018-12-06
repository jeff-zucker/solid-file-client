// @flow
import $rdf from 'rdflib';

export function getStats(graph: $rdf.IndexedFormula, subjectName: string) {
  const subjectNode = $rdf.sym(subjectName);
  const mod = $rdf.sym('http://purl.org/dc/terms/modified');
  const size = $rdf.sym('http://www.w3.org/ns/posix/stat#size');
  const mtime = $rdf.sym('http://www.w3.org/ns/posix/stat#mtime');
  return {
    modified: graph.any(subjectNode, mod, undefined).value,
    size: graph.any(subjectNode, size, undefined).value,
    mtime: graph.any(subjectNode, mtime, undefined).value,
  };
}

/** A type used internally to indicate we are handling a folder */
export const folderType = Symbol('folder');
/**
 * Return content mime-type of a file the URL point to. If it's a folder, return a symbol indicate that it is a folder.
 * @param {$rdf.IndexedFormula} graph a $rdf.graph() database instance
 * @param {string} url location of the folder
 */
export function getFileType(graph: $rdf.IndexedFormula, url: string) {
  const folderNode = $rdf.sym(url);
  const isAnInstanceOfClass = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
  const types = graph.each(folderNode, isAnInstanceOfClass, undefined);
  for (const index in types) {
    const contentType = types[index].value;
    if (contentType.match('ldp#BasicContainer')) return folderType;
    if (contentType.match('http://www.w3.org/ns/iana/media-types/')) {
      return contentType.replace('http://www.w3.org/ns/iana/media-types/', '').replace('#Resource', '');
    }
  }
  return 'unknown';
}

export type FolderItem = {
  label: string,
  url: string,
  name: string,
  modified: string,
  size: string,
  mtime: string,
  type: string | Symbol,
};
export function getFolderItems(graph: $rdf.IndexedFormula, subjectName: string) {
  const contains: {
    folders: Array<FolderItem>,
    files: Array<FolderItem>,
  } = {
    folders: [],
    files: [],
  };
  const items = graph.each($rdf.sym(subjectName), $rdf.sym('http://www.w3.org/ns/ldp#contains'), undefined);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const newItem = {
      type: getFileType(graph, item.value),
      ...getStats(graph, item.value),
      label: decodeURIComponent(item.value).replace(/.*\//, ''),
      url: '',
      name: '',
    };
    if (newItem.type === folderType) {
      newItem.url = item.value.replace(/[/]+/g, '/').replace(/https:/, 'https:/');
      newItem.name = newItem.url.replace(/\/$/, '').replace(/.*\//, '');
      contains.folders.push(newItem);
    } else {
      newItem.url = item.value;
      newItem.name = newItem.url.replace(/.*\//, '');
      // if (newItem.name === 'index.html') hasIndexHtml = true;
      contains.files.push(newItem);
    }
  }
  return contains;
}

export type FolderData = {
  type: typeof folderType,
  /** folder name (without path) */
  name: string,
  /** full URL of the resource */
  url: string,
  /** dcterms:modified date */
  modified: string,
  /** stat:mtime */
  mtime: string,
  /** stat:size */
  size: number,
  /** parentFolder or undefined if none */
  parent?: string,
  /** raw content of the folder's turtle representation */
  content: string,
  /** an array of files in the folder */
  files: Array<FolderItem>,
  /** an array of sub-folders in the folder */
  folders: Array<FolderItem>,
};
/**
 * Each item in the arrays of files and sub-folders will be a file object which is the same as a folder object except it does not have the last two fields (files,folders). The content-type in this case is not guessed, it is read from the folder's triples, i.e. what the server sends.
 * @param {$rdf.IndexedFormula} graph a $rdf.graph() database instance
 * @param {string} url location of the folder
 * @param {string} content raw content of the folder's RDF (turtle) representation,
 */
export function processFolder(graph: $rdf.IndexedFormula, url: string, content: string): FolderData {
  // log("processing folder")
  const items = getFolderItems(graph, url);
  const stats = getStats(graph, url);
  const fullName = url.replace(/\/$/, '');
  const name = fullName.replace(/.*\//, '');
  const parent = fullName.replace(name, '');
  return {
    type: folderType,
    name,
    url,
    modified: stats.modified,
    size: stats.size,
    mtime: stats.mtime,
    parent,
    content,
    folders: items.folders,
    files: items.files,
  };
}

export function guessFileType(url: string) {
  const ext = url.replace(/.*\./, '');
  if (ext.match(/\/$/)) return folderType;
  if (ext.match(/(md|markdown)/)) return 'text/markdown';
  if (ext.match(/html/)) return 'text/html';
  if (ext.match(/xml/)) return 'text/xml';
  if (ext.match(/ttl/)) return 'text/turtle';
  if (ext.match(/n3/)) return 'text/n3';
  if (ext.match(/rq/)) return 'application/sparql';
  if (ext.match(/css/)) return 'text/css';
  if (ext.match(/txt/)) return 'text/plain';
  if (ext.match(/json/)) return 'application/json';
  if (ext.match(/js/)) return 'application/javascript';
  if (ext.match(/(png|gif|jpeg|tif)/)) return 'image';
  if (ext.match(/(mp3|aif|ogg)/)) return 'audio';
  if (ext.match(/(avi|mp4|mpeg)/)) return 'video';
  /* default */ return 'text/turtle';
}

/**
 * Parse RDF text and put it into a $rdf.graph() database instance.
 * @param {string} text RDF text that can be passed to $rdf.parse()
 * @param {*} content the request body
 * @param {string} contentType Content-Type of the request
 */
export function text2graph(
  text: string,
  url: string,
  contentType: string | Symbol = guessFileType(url),
): Promise<$rdf.IndexedFormula> {
  return new Promise((resolve, reject) => {
    if (contentType === folderType) reject(new Error('Can not put folderType to $rdf.parse()'));
    const graph = $rdf.graph();
    $rdf.parse(text, graph, url, contentType, (error, newGraph) => {
      if (error) reject(error);
      else resolve(newGraph);
    });
  });
}
