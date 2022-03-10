# How to test using the file system

    Run all tests : `npm run test`

    Run a specific test : `npm run test:file path.to.test.js`


# How to test using a Server

  1. Create a folder on your pod to hold the test

  2. Create an environment variable named `BASE_TEST_URL` using the address of that folder

  3. Follow the instructions in the Solid-Node-Client README to setup login credentials

    Run all tests : `npm run test:https`

    Run specific test : `npm run test:https path.to.test.js`