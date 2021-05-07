const deployUpdate = require("../../Jolt/update");
const attachConfig = require("../../Utilities/attachConfig");
const getDescriptionPrompt = require("../../Utilities/descriptionPrompt");

const update = async () => {
  try {
    const config = require(process.env.PWD + "/config.json");
  } catch (error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first and then run 'jolt deploy' because you do not have a project"
    );
  }
  attachConfig();
  const deploymentDescription = await getDescriptionPrompt();
  deployUpdate(deploymentDescription);
}

module.exports = update;
