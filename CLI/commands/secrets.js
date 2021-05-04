const deployAllSecrets = require("../../Lambda/sendSecrets")

const secrets = () => {
  console.log("hello from secrets");
  const { projectInfo, buildInfo, AWSInfo } = require(process.env.PWD + "/config.json");
  deployAllSecrets(buildInfo.functionsFolder, projectInfo.projectId, AWSInfo.AWS_REGION);
}

module.exports = secrets;