const fs = require("fs");
const path = require("path");

const lambdaTemplate =
`// This is a generic template for a lambda function

// Note: This is the asynchronous variety of Lambda.
//       Asynchronous processes within the function should use await syntax or promises.
//       For async processes that use the event loop (such as with setTimeout),
//       you can use the the callback function parameter to return once the process has completed

exports.handler = async (event, _context, callback) => {

  // extract the body from event
  const body = JSON.parse(event.body);

  // Function logic here

  // for synchronous functions
  // callback<Error, Response>
  // callback(null, {
  //   statusCode: 200,
  //   body: JSON.stringify({
  //     hello: "world"
  //   })

  // For async functions use return value.
  // Note: body property must be valid JSON and should be stringified before it is returned
  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: "world"
    }
  })
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
  const { functionsFolder } = config.buildInfo;
  if (!functionsFolder) return console.log("functions folder not specified");
  const newFuncPath = process.argv[3].split("/").slice(0,-1).join("/");

  if (!newFuncPath) {
    throw new Error("Enter a new Lambda name or multi-segment path for a new Lambda (eg: path/to/lambdaName)");
  } else if (functionExists(functionsFolder, process.argv[3])) {
    throw new Error("You already have a Lambda by that name in your functions folder");
  }

  const functionFileName = `${path.basename(process.argv[3])}.js`;

  fs.mkdir(`${functionsFolder}/${newFuncPath}`, {recursive: true}, (err) => {
    if (err) throw err;
    fs.writeFileSync(`${functionsFolder}/${newFuncPath}/${functionFileName}`, lambdaTemplate);
  });
}

const functionExists = (funcFolder, funcPath) => {
  return fs.existsSync(`${funcFolder}/${funcPath}`);
}

module.exports = lambda;
