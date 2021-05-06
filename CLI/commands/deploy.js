const run = require('../../Core/deploy');
const getDescriptionPrompt = require("../../Utilities/descriptionPrompt");
const attachConfig = require("../../Utilities/attachConfig");

const deploy = async () => {
  attachConfig();
  const deploymentDescription = await getDescriptionPrompt();
	run(deploymentDescription);
}

module.exports = deploy;
