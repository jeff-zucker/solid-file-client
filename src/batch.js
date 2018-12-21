let testCount=-1;
let passed = 0;
let skipped = 0;
let test = [];
let quiet = false;

if( typeof(window)==="undefined" ){
    exports.runScript = runScript;
    exports.ok = ok;
    exports.fail = fail;
    exports.skip = skip;
}
else {
    batch = {
        runScript : runScript,
        ok : ok,
        fail : fail,
        skip : skip,
    }
}

function runScript(functions,verbosity){
    if(functions){
        test = functions;
        quiet = verbosity;
    }
    testCount += 1;
    let thisTest = test[testCount];
    if(thisTest){
        if(typeof(thisTest)==='string'){
            if(quiet) thisTest="";
            skip(thisTest);
        }
        else thisTest();
    }
    else if(!quiet) {
        let total = testCount - skipped;
        console.log(`#\n## Passed ${passed}/${total} tests.\n#`)
        if(passed != total) process.exit(-1);
    }
}
function ok(msg){
    console.log("ok: "+msg);
    passed++;
    runScript()
}
function skip(msg){
    if(msg) console.log("#\n## "+msg+"\n#");
    skipped = skipped+1;
    runScript()
}
function fail(msg){
    console.log("fail: "+msg);
    runScript()
}
