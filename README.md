# Jolt
Jolt is a framework for testing and deploying JAMstack apps with serverless functions.

## Getting Started
  1. Install Jolt

      `npm i -g jolt-framework`

  2. Create an app

      ```sh
      npx create-react-app jolt-first-project
      cd jolt-first-project
      ```
      paste the isnto the contents of `src/App.js`
      ```jsx
      function App() {
        return (
          <script>
            fetch(".functions/helloWorld").then(res => console.log(res))
          </script>
        );
      }

      export default App;
      ```
  3. Create a functions folder
      ```sh
      mkdir functions
      ```
  4. Jolt init

      ```sh
      jolt init
      ```
  5. Add helloWorld function


      ```sh
      jolt mklam
      ```