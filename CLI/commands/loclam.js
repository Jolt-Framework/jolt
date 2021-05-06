const concurrently = require("concurrently");
const loadConfig = require("../../Utilities/loadConfig");

const loclam = async () => {
  const { devServerCommand } = loadConfig().buildInfo;

  await concurrently([
    { command:
      `node ../../Utilities/LocalLambdas/localLambdas.js`,
      name: "Local Lambda Server",
    },
    {
      command: `cd ${process.env.PWD} && ${devServerCommand}`,
      name: "Application Server"
    }
  ]);
}

module.exports = loclam;
