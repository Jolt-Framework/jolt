const deployUpdate = require("../../Core/update");
const attachConfig = require("../../Utilities/attachConfig");

const update = () => {
  attachConfig();
  deployUpdate();
}

module.exports = update;