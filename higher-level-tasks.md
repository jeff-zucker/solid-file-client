# Tasks for "high-level" methods of solid-file-client v1.0.0

I propose calling the two kinds of methods "high-level" and "low-level".  The high-level methods
will always by default

 * replace rather than create duplicates
 * delete associated .acl and .meta files.
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

* resources to protect from deletion

    * profile, settings, and root yes
    * inbox, maybe

* how to handle write methods

    * this is complex, more here later

* how should folder trees work? 

    * copy(A,B) entirely replaces B with A? 
    * OR merges them, replacing B with A as needed?

## Shims TBD
    move
    getHead
    getLinks
    copyFile
    copyFolder
    deleteFolderRecursively
    .acl and .meta options when implemented

## Shims done, tests TBD
    createFolder(preExistingFolder)
    createFile(preExistingFile)
    copyFile(preExistingFile)
    copyFolder(preExistingFolder)

## Shims done and Tests passed in both interfaces
    login
    popupLogin
    checkSession
    logout
    createFolder
    createFile
    readFolder, readFolder(nonExistingFolder), 
    readFile, readFile(nonExistingFile)
    fetchAndParse
    updateFile
    deleteFolder(), deleteFolder(nonEmptyFolder)
    delete(file)
    itemExists, itemExists(nonExistingItem)

## Documentation TBD

All of it.