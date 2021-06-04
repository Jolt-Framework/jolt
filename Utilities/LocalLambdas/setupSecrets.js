const fetchLocalSecrets = require("../fetchLocalSecrets");

const setupSecrets = (functionPath, functionName) => {
  const secrets = fetchLocalSecrets(functionPath, functionName);

  if (secrets) {
    for (const [key, value] of Object.entries(secrets)) {
      process.env[key] = value;
    }
  }

  return () => {
    for (const key in secrets) {
      delete process.env[key];
    }
  }
}

module.exports = setupSecrets;
