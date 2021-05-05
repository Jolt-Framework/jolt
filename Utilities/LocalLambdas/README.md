# Local Lambda Testing

Plugin to the Jolt framework that provides a local testing environment for Lambdas

1. Need to add `"proxy": "port 3001"` to the react, etc. package.json file to route function requests to the function server

2. Handling path consistency:
  - Currently using ZiSi to collect a list of functions/function names, load the function and run it so paths on the front end need to be `/getNotes`, `createNote` etc.

<!-- 3. What should be passed to the function? -->
<!--   - Emulate the Lambda `event` and `context` objects as much as possible -->

4. Set this up as npm package so that you can type `core run dev` or something, and the function's server will spin up in the background while the react ap is running in your browser
  - Add `proxy PORT_NUMBER` to React package.json
  - Configure the core config file to support a script that starts the app using the specified dev command, starts the function server and proxies requests to functions appropriately

5. Support for simple logging (method, path, etc.) on the function server
