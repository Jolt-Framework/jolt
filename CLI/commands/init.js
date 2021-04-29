const prompts = require("prompts");
// const { v4 } = require("uuid");
// const { customAlphabet } = require("nanoid");
const uniqueId = require('../../Utilities/nanoid');
const { writeFileSync } = require("fs");

const init = async () => {
  let confirm;
  let results;

  const questions = [
    {
      type: "text",
      name: "projectName",
      message: `Enter a name for your project (all lowercase letters):`,
      initial: "my-project",
      validate: (cmd) =>
        cmd.trim().length < 5 || cmd != cmd.toLowerCase() ? "Project names must be 5 or more characters and lowercase" : true,
    },
    {
      type: "text",
      name: "setupCommand",
      message: "What is your app's setup command?\n (e.g. npm install, brew install hugo)",
      initial: "npm install",
      validate: (cmd) =>
        cmd.trim().length === 0 ? "Please enter a setup command" : true,
    },
    {
      type: "text",
      name: "buildCommand",
      message: `What is your app's build command?\n (e.g. npm build, npm run-script build, hugo)`,
      initial: "npm run build",
      validate: (cmd) =>
        cmd.trim().length === 0 ? "Please enter a build command" : true,
    },
    {
      type: "text",
      name: "functionsFolder",
      message: `What is the name of the functions folder?\n (e.g. functions)`,
      initial: "functions",
      validate: (cmd) =>
        cmd.trim().length === 0 ? "Please enter a functions folder name:" : true,
    },
    {
      type: "text",
      name: "buildFolder",
      message: `What is the name of the build folder?\n (e.g. public, out, build)`,
      initial: "build",
      validate: (cmd) =>
        cmd.trim().length === 0 ? "Please enter a build folder name" : true,
    },
    {
      type: "text",
      name: "AWS_REGION",
      message: "Please enter a valid AWS region (e.g us-east-1)",
      initial: "us-east-1",
      validate: (cmd) => 
        cmd.match(/^[a-z]+-[a-z]+-[0-9]+$/g) ? true : "Invalid AWS region",
    },
    // {
    //   type: "password",
    //   name: "AWS_SECRET_ACCESS_KEY",
    //   message: "Please enter your AWS Secret Access Key:",
    //   // validate: () => {}
    // },
    // {
    //   type: "password",
    //   name: "AWS_ACCESS_KEY_ID",
    //   message: "Please enter your AWS Access Key Id:",
    //   // validate: () => {}
    // },
  ];

  const confirmQuestion = {
    type: "confirm",
    name: "confirm",
    message: "Are these correct?",
    initial: true,
  };

  function formatForConfig(results) {
    const {
      projectName, 
      setupCommand, 
      buildCommand, 
      functionsFolder, 
      buildFolder, 
      AWS_REGION,
    } = results;

    const projectId = `${projectName}-${uniqueId()}`;

    return {
      projectInfo: {
        projectName,
        projectId
      },
      buildInfo: {
        setupCommand, 
        buildCommand, 
        functionsFolder, 
        buildFolder, 
      },
      AWSInfo: {
        AWS_REGION,
        bucketName: projectId + "-bucket".toLowerCase(),
        tableName: projectId + "-table".toLowerCase(),
        apiName: projectName + "-api",
        gatewayStage: "test",
        gatewayDescription: "test"
      }
    }
  }

  while (!confirm) {
    confirm = undefined;
    results = await prompts(questions);

    console.log(results);
    const isConfirmed = await prompts(confirmQuestion);
    confirm = isConfirmed["confirm"];
    if (confirm === undefined) throw "Exited initialization process";
  }

  formattedResults = formatForConfig(results);
  writeFileSync("config.json", JSON.stringify(formattedResults, null, "  "));
  return JSON.stringify(formattedResults);
};

module.exports = init;
