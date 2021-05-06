const deployUpdate = require("../../Core/update");
const attachConfig = require("../../Utilities/attachConfig");
const getDescriptionPrompt = require("../../Utilities/descriptionPrompt");

const update = async () => {
  attachConfig();
  const deploymentDescription = await getDescriptionPrompt();
  deployUpdate(deploymentDescription);
}

module.exports = update;
