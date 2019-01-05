/*
*  TBD internationalization
*/
module.exports = function(type,thing){
    switch(type) {
        case "file" :
            console.log(thing)
            break
        case "folder" : 
            /*
            * TBD : full folder listing with size, stat, perms 
            */
            for(var o in thing.folders ){ 
                console.log( "folder : " + thing.folders[o].name ) 
            }
            for(var i in thing.files ){ 
                console.log( thing.files[i].name ) 
            }
            break;

        case "help" : 
            console.log(`
----------------------------------------------------------------------------
   sol - interactive shell for Solid <http://jeff-zucker.github.io/sol>
----------------------------------------------------------------------------
 h|help                         show this help text
 q|quit                         logout and exit
 r|read <URL>                   read & show contents of a remote file
rf|readFolder <URL>             read & show contents of a remote folder
cf|createFolder <URL...>        create remote folder(s)
rm|delete <URL...>              delete remote file(s) or empty folder(s)
up|upload <target> <files...>   upload file(s) to a remote location
dn|download <target> <URL>      download file(s) to the local disk
cp|copy <oldURL> <newURL>       copy a file from one remote location to another

Notes: elipsis (...) indicates multiple files; for all but "cf" these can
include file globs e.g. "rm /public/foo/*"; for all, including "cf", you may
list  multiple space-separated files e.g. "up /public/foo file1.txt file2.txt".
None of the commands recurse into sub-folders (yet).  The "target" parameter
is always a folder, not a filename.
`);
            break
    }
}
