const Dynamo = require("../Dynamo/dynamo");
const Lambda = require("./lambda");
const { UpdateFunctionConfigurationCommand } = require("@aws-sdk/client-lambda");
const path = require('path');
const fs = require('fs');
const dotenv = require("dotenv");
const { listFunctions } = require("../Utilities/zip-it-and-ship-it/src/main");
const { lambdaFileToName, lambdaARNToName } = require("../Utilities/textConverter");

// Note: ListFunctionsCommand is limited to 50 functions per call.
// Ultimately, we might want to query the database for the infrastructure list associated with this deployment and use that for our list of functions
const deployAllSecrets = async (functionsFolderPath, tableName, region) => {
  const lambdas = await loadLambdaNames(tableName, region);
  const functions = await listFunctions(functionsFolderPath);

  if (allFunctionsDeployed(lambdas.map(lambdaARNToName), functions)) {
    functions.forEach(async (func, i) => {
			const funcPath = func.mainFile;
			const funcName = lambdaFileToName(funcPath);

      const secrets = fetchLocalSecrets(funcPath, funcName);
      if (secrets) {
        try {
          await send(secrets, lambdas[i]);
          console.log(`secrets sent to ${funcName}`);
        } catch (err) {
          console.log(`an error occurred while sending secrets to ${funcName}:\n${err}`);
        }
      }
    })
  } else {
    console.log(`one or more functions in your functions folder at:\n${functionsFolderPath}\nhasn't been deployed to aws yet. please push your current application codebase to github to trigger a new deployment. try again once deployment is complete`);
  }
}

const send = async (secrets, funcName) => {
  console.log(funcName);
  const params = {
    FunctionName: funcName,
    Environment: {
      Variables: {
        ...secrets
      }
    }
  }

  await Lambda.Client.send(new UpdateFunctionConfigurationCommand(params));
}

// Here I'm assuming that the first item in the table is the most recent deployment, and contains the collection of Lambdas+versions that we want to send the secrets to.
const loadLambdaNames = async (tableName, region) => {
  const db = new Dynamo(region);

  const tableItems = await db.getItems(tableName);
  const lambdaARNs = tableItems[tableItems.length-1].config.lambdas;
  return lambdaARNs//.map(lambdaARNToName);
}

const fetchLocalSecrets = (funcPath, funcName) => {
  const envPath = path.dirname(funcPath) + "/.env";
  if (fs.existsSync(envPath)) {
    return dotenv.parse(fs.readFileSync(envPath));
  } else {
    console.log(`No .env file found for function: ${funcName}`);
  }
}

const allFunctionsDeployed = (lambdas, functions) => {
  return functions.every(func => {
    const funcName = lambdaFileToName(func.name);
    return lambdas.includes(funcName);
  })
}

module.exports = deployAllSecrets;
