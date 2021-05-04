const config = require(process.env.PWD + "/config.json");
const fs = require("fs");
const path = require("path");

const lambdaTemplate =
`// This is a generic template for a lambda function

// Note: This is the asynchronous variety of Lambda.
//       Asynchronous processes within the function should use await syntax or promises.
//       For async processes that use the event loop (such as with setTimeout),
//       you can use the the callback function parameter to return once the process has completed

exports.handler = async (event, context, callback) => {


  // Function logic here


  // Function return value.
  // Note: body property must be valid JSON and should be stringified before it is returned
  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: "world"
    })
  }
}
`;

const newlam = () => {
  const { functionsFolder } = config.buildInfo;
  const newFuncPath = process.argv[3];

  if (!newFuncPath) {
    throw new Error("Enter a new Lambda name or multi-segment path for  a new Lambda (eg: path/to/lambdaName)");
  } else if (functionExists(functionsFolder, newFuncPath)) {
    throw new Error("You already have a Lambda by that name in your functions folder");
  }

  const functionFileName = `${path.basename(newFuncPath)}.js`;

  fs.mkdir(`${functionsFolder}/${newFuncPath}`, {recursive: true}, (err) => {
    if (err) throw err;
    fs.writeFileSync(`${functionsFolder}/${newFuncPath}/${functionFileName}`, lambdaTemplate);
  });
}

const functionExists = (funcFolder, funcPath) => {
  return fs.existsSync(`${funcFolder}/${funcPath}`);
}

module.exports = newlam;
