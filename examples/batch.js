let testCount=-1;
let passed = 0;
let skipped = 0;
let test = [];
let quiet = false;
let done = false;

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

function run(functions,callback,verbosity){
    if(functions){
        test = functions;
        done = callback;
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
    else {
        let total = testCount - skipped;
        if(total===0) {
            if(done) done();        
        }
        else {
          if(!quiet ) console.log(`#\n## Passed ${passed}/${total} tests.\n#`)
          if(passed != total) abort("Failed some tests ... ");
          if(done) done();        
        }
    }
}
function abort(msg){
    if(!quiet && msg) console.log(msg);
    test=undefined;
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
        newFolder   : opts.base + opts.test,
        newFile     : opts.base + opts.test + 'test.txt',
        newText     : 'hello new Solid world!',
        credentials : {
            idp      : opts.idp,
            username : opts.username,
            password : opts.password,
        }
    };
    if(typeof(window)!="undefined"){
       cfg.credentials = opts.idp;
    }
    return cfg;
}

