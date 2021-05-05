
const Gateway = require("../../aws/gateway");
const CloudFrontWrapper = require("../../aws/cloudfront");
const Lambda = require("../../aws/lambda");
const S3 = require("../../aws/s3");

class Teardown {
  constructor({ region, bucket, lambdas, files, api, cloudfrontId, edgeLambdas, deployed }) {
    this.region = region
    this.bucket = bucket;
    this.lambdas = lambdas;
    this.files = files
    this.edgeLambdas = edgeLambdas;
    this.deployed = deployed
    if (api) this.api = Object.assign(new Gateway(api.apiName, region), api);
    this.cloudfrontId = cloudfrontId;
  }

  async all() {
    if (this.deployed || this.cloudfrontId) {
      let client = await new CloudFrontWrapper(this.region)
      const res = await client.disableDistribution(this.cloudfrontId)
      const confirmation = await client.deleteDistribution(this.cloudfrontId, () => {
        this.handleEdgeLambda()
      });
      await this.waitForDistribution()
    } else {
      if (this.edgeLambdas.length > 0) this.lambdas = this.lambdas.concat(this.edgeLambdas)
      await this.waitForDistribution();
    }


  }

  async handleEdgeLambda() {
    await Lambda.teardown(this.edgeLambdas)
  }
  async waitForDistribution(time = 0) {
    if (time > 0) return
    try {
      if (this.api)     await this.api.deleteApi();
      if (this.lambdas) await Lambda.teardown(this.lambdas);
      if (this.files)   await S3.teardown(this.bucket, this.files);
    } catch (error) {
      let newTime = time + 1000

      setTimeout(() => {
        this.waitForDistribution(newTime)
      }, newTime)
    }
  }
}

module.exports = Teardown;