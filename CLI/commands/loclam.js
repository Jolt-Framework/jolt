const runLocalLambdas = require("../../Utilities/LocalLambdas/localLambdas")

const loclam = () => {
  const { buildInfo } = require(process.env.PWD + "/config.json");

  runLocalLambdas(buildInfo.functionsFolder);
}

module.exports = loclam;
