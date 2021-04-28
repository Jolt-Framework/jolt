const Gateway = require('../APIGateway/gateway');
const CloudFrontWrapper = require("../CloudFront/cloudfront")

const run = async (id) => {
  let cf = new CloudFrontWrapper();
  const res = await cf.disableDistribution(id);
  console.log("from disable", res);
  let conf = await cf.deleteDistribution(id)
  console.log("from del:", conf);
}

run("E11H83AEEGCZNE");