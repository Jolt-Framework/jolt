const { listFunctions } = require("../../zip-it-and-ship-it/src/main");
const path = require("path");

const attachLocalFunctionPaths = (functionsFolder) => {
  return (async (req, _, next) => {
    const functions = await listFunctions(functionsFolder)

    req.funcMap = functions.reduce((funcMap, currentFunc) => {
      const funcName = currentFunc.name.replace(path.extname(currentFunc.name), "");

      funcMap[funcName] = currentFunc.mainFile;

      return funcMap;
    }, {});

    next();
  })
}

module.exports = attachLocalFunctionPaths;
