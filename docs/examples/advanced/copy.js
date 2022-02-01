//code goes here
const auth = solidClientAuthentication.getDefaultSession();      
const fileClient = new SolidFileClient( auth, { enableLogging: true });

...
