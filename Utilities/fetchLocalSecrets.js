const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const fetchLocalSecrets = (funcPath, funcName) => {
  const envPath = path.dirname(funcPath) + "/.env";

  if (fs.existsSync(envPath)) {
    return dotenv.parse(fs.readFileSync(envPath));
  } else {
    console.log(`No .env file found for function: ${funcName}`);
  }
}

module.exports = fetchLocalSecrets;
