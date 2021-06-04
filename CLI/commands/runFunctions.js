const server =  require("../../Utilities/LocalLambdas/localLambdas");
const loadConfig = require("../../Utilities/loadConfig");

const runFunctions = async () => {
  let config;
  try {
    config = loadConfig();	
  } catch (err) {
    console.log(err.message)
    return;
  }

	const { functionServerPort } = config.devServerInfo;
	const { functionsFolder } = config.buildInfo;

	server(functionServerPort, functionsFolder);
}

module.exports = runFunctions;
