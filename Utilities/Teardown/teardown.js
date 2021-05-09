const Gateway = require("../../aws/gateway");
const CloudFrontWrapper = require("../../aws/cloudfront");
const Lambda = require("../../aws/lambda");
const S3 = require("../../aws/s3");


class Teardown {
  constructor({ region, bucket, lambdas, files, api, cloudfrontId, edgeLambdas, deployed, version }) {
    this.region = region
    this.bucket = bucket;
    this.lambdas = lambdas;
    this.files = files
    this.edgeLambdas = edgeLambdas;
    this.deployed = deployed
    if (api) {
      this.api = Object.assign(new Gateway(api.apiName, region), api);
      this.api.stageName = version;
    }
    this.cloudfrontId = cloudfrontId;
  }

  async all() {
    let numberOfVersions;

    if (this.api) {
      let versions = await this.api.getVersions();
      numberOfVersions = versions.length;
    }

    if (this.deployed || this.cloudfrontId) {
      let client = new CloudFrontWrapper(this.region);

      if (numberOfVersions <= 1) {
        const res = await client.disableDistribution(this.cloudfrontId)
        const confirmation = await client.deleteDistribution(this.cloudfrontId, () => {
          this.handleEdgeLambda()
        });
      }
    } else {
      if (this.edgeLambdas.length > 0) this.lambdas = this.lambdas.concat(this.edgeLambdas)
    }

    if (numberOfVersions <= 1) this.api && await this.api.deleteApi();
    else                       this.api && await this.api.deleteStage();

    this.lambdas && await Lambda.teardown(this.lambdas);
    if (this.files) {
      if (numberOfVersions <= 1) await S3.teardownAll(this.bucket);
      else                       await S3.teardown(this.bucket, this.files);
    }
  }

  async handleEdgeLambda() {
    await Lambda.teardown(this.edgeLambdas)
  }

  async waitForDistribution(time = 0) {
    if (time > 0) return
    try {
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