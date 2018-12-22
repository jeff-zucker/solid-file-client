let testCount=-1;
let passed = 0;
let skipped = 0;
let test = [];
let quiet = false;

if( typeof(window)==="undefined" ){
    exports.run = run;
    exports.ok = ok;
    exports.fail = fail;
    exports.skip = skip;
    exports.abort = abort;
    exports.getConfig = getConfig;
}
else {
    batch = {
        run : run,
        ok : ok,
        fail : fail,
        skip : skip,
        abort : abort,
        getConfig : getConfig,
    }
}

function run(functions,verbosity){
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
        if(passed != total) abort("Failed some tests ... ");
    }
}
function abort(msg){
    if(!quiet && msg) console.log(msg);
    test=undefined;
    if(typeof(window)==="undefined") process.exit(-1);
}
function ok(msg){
    console.log("ok: "+msg);
    passed++;
    run()
}
function skip(msg){
    if(msg) console.log("#\n## "+msg+"\n#");
    skipped = skipped+1;
    run()
}
function fail(msg){
    console.log("fail: "+msg);
    run()
}
function getConfig(opts) { 
    let cfg= {
        newFolder   : opts.base,
        newFile     : opts.base + 'test.txt',
        newText     : 'hello new Solid world!',
        credentials : {
            idp      : opts.idp,
            username : opts.user,
            password : opts.pass
        }
    };
    if(typeof(window)!="undefined"){
       cfg.credentials = opts.idp;
    }
    return cfg;
}

