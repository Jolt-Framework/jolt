const concurrently = require("concurrently");
const loadConfig = require("../../Utilities/loadConfig");

const dev = async () => {
  try {
    const config = require(process.env.PWD + "/config.json");
  } catch (error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first"
    );
  }

  const { devServerCommand } = loadConfig().buildInfo;

  if (!devServerCommand) return console.log(
    "There is no dev server command please manually add one in config.json under buildInfo"
  );

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

module.exports = dev;
