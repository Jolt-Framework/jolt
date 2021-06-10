const fs = require("fs");
const path = require("path");
const log = (text) => console.log(`\x1b[32m✔\x1b[0m ${text}`);
const errlog = (text) => console.log(`\x1b[31m✘\x1b[0m ${text}`);

const lambdaTemplate =
`// This is a generic template for a lambda function

// Note: This template is for asynchronous Lambdas.
//       Asynchronous processes within the function should use await syntax or 
//       promises.

//       For async processes that use the event loop (such as setTimeout), you 
//       can use the the callback function parameter to return once the process
//       has completed.

exports.handler = async (event, context, callback) => {

  // To extract the body from event
  // const body = JSON.parse(event.body);

  // Function logic here...

  // For synchronous functions use the callback function argument to return a
  // response.

  // callback<Error, Response>
  // callback(null, {
  //   statusCode: 200,
  //   body: JSON.stringify({
  //     hello: "world"
  //   })

  // For async functions use a normal return value.
  // Note: Body property must be valid JSON and should be stringified before it
  // is returned.
  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: "world"
    }),
  }
}
`;

const lambda = () => {
let config
  try {
    config = require(process.env.PWD + "/config.json");
  } catch (error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first"
    );
  }
  if (process.argv[3] === undefined) {
    errlog("A function name must be specified in the format \"optional/path/to/functionName\".");
    return;
  }

  const { functionsFolder } = config.buildInfo;

  if (!functionsFolder) return errlog("Functions folder not specified");

  let newFuncPath = process.argv[3].split("/").slice(0,-1).join("/");
  const functionFileName = `${path.basename(process.argv[3])}.js`;

  if (functionExists(functionsFolder, newFuncPath, functionFileName)) {
    errlog("You already have a Lambda by that name in your functions folder");
    return;
  }

  fs.mkdir(`${functionsFolder}/${newFuncPath}`, {recursive: true}, (err) => {
    if (err) throw err;
    fs.writeFileSync(`${functionsFolder}/${newFuncPath}/${functionFileName}`, lambdaTemplate);
  });

  log(`Function created: ${newFuncPath}/${functionFileName}`)
}

const functionExists = (funcFolder, newFuncPath, funcFileName) => {
  return fs.existsSync(`${funcFolder}/${newFuncPath}/${funcFileName}`);
}

module.exports = lambda;
