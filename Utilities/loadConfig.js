const loadConfig = () => {
  try {
    return require(process.env.PWD + "/config.json");
  } catch (err) {
    throw("config.json not found. Please initialize this project with 'jolt init' before running this command");
  }
}

module.exports = loadConfig;
