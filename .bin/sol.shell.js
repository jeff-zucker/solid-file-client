const sol = require('./sol.run.js');

function prompt(question, callback) {
    var stdin  = process.stdin, stdout = process.stdout;
    stdin.resume();
    stdout.write(question);
    stdin.once('data', function (data) {
        callback(data.toString().trim());
    });
}
function sh(){
    prompt("> ", data => {
        /*
        *  TBD : real command parsing rather than split
        */
        let args = data.split(/\s+/)
        let com = args.shift()
        if( com.match(/(q|quit|exit)/) ) process.exit();
        sol( com, args ).then(()=>{sh()},err=>{
            console.log(err);
            sh();
        });
    });
}
module.exports = sh;
