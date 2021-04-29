const STS = require("@aws-sdk/client-sts");

​const token = async (AWS_REGION) => {
   const sts = new STS.STS({ region: AWS_REGION });
   const res = await sts.getCallerIdentity({});
   return res.Account;
};

module.exports = token;
​