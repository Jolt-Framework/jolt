const { listFunctions } = require("../../zip-it-and-ship-it/src/main");
const path = require("path");

const attachLocalFunctionPaths = (functionsFolder) => {
  return (async (req, _, next) => {
    const functions = await listFunctions(functionsFolder)

    req.funcMap = functions.reduce((funcMap, currentFunc) => {
      const funcName = currentFunc
        .replace(path.extname(currentFunc), "")
        .replace(/^functions\//g, "");


      funcMap[funcName] = `${process.env.PWD}/${currentFunc}`;

      return funcMap;
    }, {});

    next();
  })
}

module.exports = attachLocalFunctionPaths;
