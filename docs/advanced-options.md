@Otto_A_A and @Bourgeoa, here's a way that makes sense to me to document the advanced interface.  It differs from what we have in several cases, but I think makes things much easier to explain.  Basically, rather than refering users to multiple methods (readFile vs get, or putFile vs postFile) this way puts all advanced otpions in options flags.  These are all only suggestions, please let me know your thoughts.

# Using Solid-File-Client's advanced options

## forcePOST

Solid supports a POST method which allows a server to create multiple versions of a file.  For example, in Node-Solid-Server, if you POST a file /foo/bar.ttl and it already exists, the server will generate a URL something like /foo/35778-bar.ttl, creating a second version of the file.  By default, Solid-File-Client disables this feature, allowing the createFile() and createFolder() methods to work more as users of traditional web servers might expect.  However the more Solid-like behavior may be easily turned on by setting the forcePOST options flag to true.

  createFile( url, ... )                        // uses PUT
  createFile( url, ..., { forcePOST:true } )    // uses POST

  createFolder( url, ... )                      // uses PUT-like POST
  createFolder( url, ..., { forcePOST:true } )  // uses POST

In addition to allowing multiple versions, setting the forcePOST options flag to true enables other features of POST : the create methods will fail if the requested resource's parent folder doesn't already exist, the new version's URL will be returned in the response's location header.

  [TBD : example of reading the location header from a response to a POST]

## includeLinks

One of Solid's unique features is the use of linked files.  Currently the two main types of linked files are .acl files which control access to the main file they are linked from and .meta files which describe additional features of the file they are linked from.  Solid-file-client, by default treats these linked files as tightly bound to the resource they are referencing.  In other words when you delete, move, or copy a file that has linked files, the linked files will also be deleted, moved, or copied.  These defaults should be sufficient for most basic usage.  Advanced users can loosen the bond between a resource and its linked files with the includeLinks option flag that defaults to true.

  deleteFile( url )                         // deletes url & its linked files
  deleteFile( url { includeLinks:false } )  // deletes only the url

The same option flag may be used with commands to copy and move files and folders.  

This option flag may also be used with readFolder().  By defaut, readFolder() lists all files contained in the folder including .acl and .meta files.  This can be resource consuming for large folders because each linked file requires a separate lookup.  To avoid this overhead, you may set includeLinks to false.

  readFolder( url )                         // includes linked files
  readFolder( url { includeLinks:false } )  // does not include linked files

## modifyACL

Solid-file-client makes a special case for access control (.acl) files.  These files may contain absolute links which will no longer work when the file is copied or moved.  So solid-file-client, by default, will modify .acl files to change absolute links to relative ones.  Advanced users who wish to skip this modification, may use the modifyACL option flag which defaults to true.

    copyFile( source, target )                     // modifies.acl if needed
    copyFile( source, target, {modifyACL:false} )  // does not modify .acl

The same option flag may be used with copyFolder(), moveFile(), and moveFolder().

## prepareContent

Solid-file-client's readFile() method, by default returns either text or a blob depending on the content-type of the file.  Advanced users who want a raw GET, (i.e. return a Stream rather than text or a blob) may set the prepareContent option flag which defaults to true.  

    readFile( url )                           // returns text or blob
    readFile( url, { prepareContent:false } ) // returns raw GET response

## acceptType

In some situations Solid servers can serve multiple representations from a single URL.  A URL of /foo/ might return a folder listing or an index.html file.  A URL pointing to an RDF resource might return the resource as Turtle or as JSON-LD or some other RDF format.  In these cases, users may specify which of the alternate representations they want to see using the acceptType option flag.

    readFile( url )                                // returns Server's choice
    readFile( url, { acceptType:"text/turtle" } )  // returns Turtle
