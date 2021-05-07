const { zipFunctions } = require("../../src/main");

(async () => {
  await zipFunctions("functions", "archives");
})()