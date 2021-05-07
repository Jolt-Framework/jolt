const run = require('../../Jolt/deploy');
const getDescriptionPrompt = require("../../Utilities/descriptionPrompt");
const attachConfig = require("../../Utilities/attachConfig");

const deploy = async () => {
  try {
    const config = require(process.env.PWD + "/config.json");
  } catch(error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first"
    );
  }
  attachConfig();
  const deploymentDescription = await getDescriptionPrompt();
	run(deploymentDescription);
}

module.exports = deploy;
