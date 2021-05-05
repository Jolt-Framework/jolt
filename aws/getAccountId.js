const STS = require("@aws-sdk/client-sts");
const sts = new STS.STS({region: "us-east-1"});

module.exports = async () => {
  return await (await sts.getCallerIdentity({})).Account;
};