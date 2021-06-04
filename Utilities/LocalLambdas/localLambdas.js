const express = require('express');
const createCallback = require("./createCallback");
const createEvent = require("./createEvent");
const logRequest = require("./middleware/logger");
const attachLocalFunctionPaths = require("./middleware/attachLocalFunctionPaths");
const setupSecrets = require("./setupSecrets");

const runLocalLambdas = (functionServerPort, functionsFolder) => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(attachLocalFunctionPaths(functionsFolder));
  app.use(logRequest);

  console.log(`Local Lambdas running on port ${functionServerPort}...`);

  app.all("/.functions/*", async (req, res) => {
    let functionName = req.url.replace(/^\/\.functions\//, "");

    const functionPath = req.funcMap[functionName];

    if (!functionPath) {
      res.status(404).send({
        error: `Function: "${functionName}" wasn't found`
      });
    } else {
      const functionEvent = createEvent(req);
      const clearSecrets = setupSecrets(functionPath, functionName);
      const requestedFunction = require(functionPath).handler;

      const callbackStatus = { sent: false };
      const cleanup = () => {
        delete require.cache[require.resolve(functionPath)];
        clearSecrets();
      }

      const callback = createCallback(callbackStatus, cleanup, res);

      try {
          let output = await requestedFunction(
            functionEvent,
            {},
            callback
          );

        if (requestedFunction.constructor.name === "AsyncFunction" && 
            !callbackStatus.sent) {
          callback(null, output);
        }
      } catch(err) {
        cleanup();
        console.log(err);
      }
    }
  })

  app.listen(functionServerPort || 3001);
}

module.exports = runLocalLambdas;
