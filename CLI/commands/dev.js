const concurrently = require("concurrently");
const loadConfig = require("../../Utilities/loadConfig");

const dev = async () => {
  let devServerCommand;

  try {
    devServerCommand = loadConfig().devServerInfo.devServerCommand;
  } catch (error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first"
    );
  }

  if (!devServerCommand) return console.log(
    "There is no dev server command please manually add one in config.json under buildInfo"
  );

  await concurrently([
    { command:  `jolt functions`,
      name: "Local Lambda Server",
    },
    {
      command: `cd ${process.env.PWD} && ${devServerCommand}`,
      name: "Application Server"
    }
  ]);
}

module.exports = dev;
