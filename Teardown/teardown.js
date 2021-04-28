
const Gateway = require("../APIGateway/gateway");
const CloudFrontWrapper = require("../CloudFront/cloudfront");
const Lambda = require("../Lambda/lambda");
const S3 = require("../S3/s3");

class Teardown {
  constructor({ region, bucket, lambdas, api, cloudfrontId, edgeLambdas, deployed }) {
    this.region = region
    this.bucket = bucket;
    this.lambdas = lambdas;
    this.edgeLambdas = edgeLambdas;
    this.deployed = deployed
    if(api) this.api = Object.assign(new Gateway(api.apiName), api);
    this.cloudfrontId = cloudfrontId;
  }

  async all() {
    if (this.deployed) {
      let client = await new CloudFrontWrapper(this.region)
      const res = await client.disableDistribution(this.cloudfrontId)
      const confirmation = await client.deleteDistribution(this.cloudfrontId, () => {
        this.handleEdgeLambda()
      });
      this.waitForDistribution()
    } else {
      this.handleEdgeLambda();
      this.waitForDistribution();
    }
    
    
  }

  handleEdgeLambda() {
    Lambda.teardown(this.edgeLambdas)
  }
  waitForDistribution(time=0) {
    try {
      if (this.api) this.api.deleteApi();
      if (this.lambdas) Lambda.teardown(this.lambdas);
      if (this.bucket) S3.teardown(this.bucket);
    } catch (error) {
      let newTime = time + 120002
      if (newTime > 120003) throw new Error("unable to remove all items") 
      console.log("the error message", error.message);
      console.log(`will try again in ${newTime / 1000} seconds`)
      setTimeout(() => {
        this.waitForDistribution(newTime)
      }, newTime)
    }
  }
}

module.exports = Teardown;