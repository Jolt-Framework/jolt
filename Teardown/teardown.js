
const CloudFrontWrapper = require("../CloudFront/cloudfront");
const Lambda = require("../Lambda/lambda");
const S3 = require("../S3/s3");

class Teardown {
  constructor({ region, bucket, lambdas, api, cloudfrontId }) {
    this.region = region
    this.bucket = bucket;
    this.lambdas = lambdas;
    this.api = api;
    this.cloudfrontId = cloudfrontId;
  }

  async all() {
    if (this.cloudfrontId) {
      let client = await new CloudFrontWrapper(this.region)
      const res = await client.disableDistribution(this.cloudfrontId)
      const confirmation = await client.deleteDistribution(this.cloudfrontId);
    }
    await this.waitForDistribution()

  }

  async waitForDistribution(time = 0) {
    try {
      if (this.api) await this.api.deleteApi();
      if (this.lambdas) await Lambda.teardown(this.lambdas);
      if (this.bucket) await S3.teardown(this.bucket);
    } catch (error) {
      newTime = time + 120000
      if (newTime > 300000) throw new Error("unable to remove all items") 
      console.log("the error message", error.message);
      console.log(`will try again in ${newTime / 1000} seconds`)
      setTimeout(() => {
        this.waitForDistribution(newTime)
      }, newTime)
    }
  }
}

module.exports = Teardown;