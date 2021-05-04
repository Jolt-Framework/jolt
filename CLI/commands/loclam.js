const runLocalLambdas = require("../../LocalLambdas/localLambdas")

const loclam = () => {
  const { buildInfo } = require(process.env.PWD + "/config.json");

  runLocalLambdas(buildInfo.functionsFolder);
}

module.exports = loclam;
