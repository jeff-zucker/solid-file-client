const SolidFileClient = require('./');
const {SolidNodeClient} = require('solid-node-client');
let auth = new SolidNodeClient();
let fc = new SolidFileClient(auth);
const file1 = "file://"+process.cwd()+"/test/test1.txt";
const file2 = "https://jeff-zucker.solidcommunity.net/public/test/test2.txt";

async function test(){
  const CREDENTIALS = require('./creds');
  await auth.login( CREDENTIALS );
  let r1 =  await fc.putFile(file1,"","text/plain");
  let r2 =  await fc.putFile(file2,"","text/plain");
  console.log(r1,r2);
}
test();

