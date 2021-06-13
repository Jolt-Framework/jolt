const server =  require("../../Utilities/LocalLambdas/localLambdas");
const loadConfig = require("../../Utilities/loadConfig");
const errlog = (text) => console.log(`\x1b[31m✘\x1b[0m ${text}`);

const runFunctions = async () => {
  let config;

  try {
    config = loadConfig();	
  } catch (err) {
    errlog(err);
    return;
  } 

	const { functionServerPort } = config.devServerInfo;
	const { functionsFolder } = config.buildInfo;

	server(functionServerPort, functionsFolder);
}

module.exports = runFunctions;
