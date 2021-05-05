const run = require('../../Core/deploy');
const attachConfig = require("../../Utilities/attachConfig");

const deploy = () => {
  attachConfig();
  run();
}

module.exports = deploy;