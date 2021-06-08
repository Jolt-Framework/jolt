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
        fetch(".functions/helloWorld")
          .then(res => res.json()
            .then(data => alert(JSON.stringify(data))
          )
        )
        return <h1>Hello World!</h1>;
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
      jolt lambda helloWorld
      ```
  6. Test the application

      ```sh
      jolt dev
      ```

To demo a larger app, use our `jolt-notes` repository.