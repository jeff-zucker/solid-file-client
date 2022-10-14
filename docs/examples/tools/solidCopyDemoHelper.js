// file docs/examples/tools/solidCopyDemoHelper.js
// restructure february 2022 by @ewingson
// helper class that fulfills the needed promise in solidCopyDemo.js
async function solidCopyDemoHelper(von,an,mer,cp,wacl,wmeta) {
console.log('solidCopyDemoHelper code started');
let antwort = 42;
//const authn = solidClientAuthentication.getDefaultSession();
//const fc = new SolidFileClient( authn, { enableLogging: true });

/*let content = fc.copy(von, an, {
    mer,
    cp,
    wacl,
    wmeta
})*/

return antwort;
}
export default solidCopyDemoHelper;
