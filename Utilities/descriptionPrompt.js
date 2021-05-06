const prompts = require("prompts");

const getDescriptionPrompt = async () => {
  const question = {
    type: "text",
    name: "value",
    message: "Enter a description for this deployment"
  }

  const description = await prompts(question);

  return description.value;
}

module.exports = getDescriptionPrompt;
