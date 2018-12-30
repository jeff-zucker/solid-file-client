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
sol - interactive shell for Solid v.0.1.0 <http://jeff-zucker.github.io/sol>
----------------------------------------------------------------------------
h|help                      show this help text
r|read <URL>                read & show contents of remote file or folder
d|download <URL>            download a file to the local disk
u|upload <file> <URL>       upload a file to a remote location
q|quit|exit                 logout and exit
rm|delete <URL>             delete a remote file or empty folder
cp|copy <oldURL> <newURL>   copy a file from one remote location to another
ls|dir                      list contents of local folder
create <URL>                create a remote file
createFolder <URL>          create a remote folder
`);
            break
    }
}
