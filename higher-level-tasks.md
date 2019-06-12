# Tasks for "high-level" methods of solid-file-client v1.0.0

I propose calling the two kinds of methods "high-level" and "low-level".  The high-level methods
will always by default

 * replace rather than create duplicates
 * copy, move, and delete associated .acl and .meta files.
 * return contents as a string, blob, or object; but never as a readableStream

Whereas , in low-level methods, the first two are optional and the third (almost?) always returns a readableStream

Alternate low-level methods (e.g. putFile instead of createFile) will support readableStream and native Solid put, 
and other more solid-like things. Also the same for an overwrite=false flag and one or more .acl/.meta flags that 
will change the default behavior of some methods. 

This document is where I'll track the decisions & tasks needed and tasks accomplished towards
finishing the high-level methods.

These are high-level methods as I see them

    createFolder, createFile, readFolder, readFile, fetchAndParse, updateFile, move,
    copyFile, copyFolder, deleteFolder,  deleteFile, deleteFolderRecursively,
    getHead, getLinks, itemExists, login, popupLogin, checkSession, logout


I will use the word "shim" to mean the SolidFileClient method that calls the appropriate SolidApi method(s) and sends responses using the appropriate interface (throwErrors or not)

## Points needing deciding

  (see [the github issue on write methods](https://github.com/jeff-zucker/solid-file-client/issues/49)


## Shims & Tests TBD
    
    move
    copyFile
    copyFolder
    deleteFolderRecursively
    .acl and .meta copy/delete
    recursive creation of folders

## Refactor Shims to dual-interface TBD
    login
    popupLogin
    checkSession
    logout

## Shims done, tests TBD
    createFolder(preExistingFolder)
    createFile(preExistingFile)
    copyFile(preExistingFile)
    copyFolder(preExistingFolder)

## Shims done and Tests passed in both interfaces
    createFolder
    createFile
    readFolder, readFolder(nonExistingFolder), 
    readFile, readFile(nonExistingFile)
    fetchAndParse
    updateFile
    deleteFolder(), deleteFolder(nonEmptyFolder)
    delete(file)
    itemExists, itemExists(nonExistingItem)
    getHead
    getLinks

## Documentation TBD

All of it.