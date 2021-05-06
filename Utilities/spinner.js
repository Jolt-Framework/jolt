const ora = require("ora");

module.exports = async (action, text) => {
  const res = Promise.resolve(async () => await action());
  ora.promise(res, text);
};