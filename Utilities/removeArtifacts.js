const loadConfig = require("./loadConfig");
const Builder = require("./builder");

module.exports = async () => {
  const config = loadConfig();

  let arch = new Builder("rm -rf archives");
  await arch.build();
  let build = new Builder(`rm -rf ${config.buildInfo.buildFolder}`);
  await build.build();
}

