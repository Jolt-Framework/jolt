const { zipFunctions } = require("../../Utilities/zip-it-and-ship-it/src/main");

async function run() {
  await zipFunctions("functions", "archives");
}

run();