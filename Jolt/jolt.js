const Lambda = require("../aws/lambda");
const CloudFrontWrapper = require("../aws/cloudfront");
const Gateway = require("../aws/gateway");
const Iam = require("../aws/iam");
const walkDirs = require("../Utilities/walkDirs");
const fs = require("fs");
const Zip = require("adm-zip");
const path = require("path");
const dotenv = require("dotenv");
const { zipFunctions } = require("../Utilities/zip-it-and-ship-it/src/main");
const uniqueId = require("../Utilities/nanoid");
const fetchLocalSecrets = require("../Utilities/fetchLocalSecrets");
const S3 = require("../aws/s3");

class JOLT {
  static #deployment;

  static get deployment() {
    return JOLT.#deployment;
  }

  static set deployment(deployment) {
    JOLT.#deployment = deployment;
  }

  static #config;

  static get config() {
    return JOLT.#config;
  }

  static set config(config) {
    JOLT.#config = config;
  }

  static toFuncName(path) {
    return path.split("/").slice(1).join("/").split(".").slice(0, -1).join(".");
  }

  static toFileName(funcName, extension) {
    return funcName.replace(/\//g, "-") + extension;
  }

  static async updateProxy(cloudfrontId, proxyArn) {
    let cloudfront = new CloudFrontWrapper(this.config.region);
    let res = await cloudfront.updateEdgeLambda(cloudfrontId, proxyArn);
    return res;
  }

  static async updateLambdasAndGateway(bucket, dataForUpdate) {
    const { buildInfo, AWSInfo } = this.config;
    const {
      AWS_REGION,
      apiName,
      gatewayStage,
      gatewayDescription,
    } = AWSInfo;

    const version = this.#deployment.version;
    const { functionsFolder } = buildInfo;

    let api = new Gateway(apiName, AWS_REGION, version);
    this.api = api;
    api.apiId = dataForUpdate.apiId;

    const iam = new Iam(AWS_REGION);
    const lambdaRole = await iam.createLambdaRole();
    await api.clearRoutes();
    console.log('Creating functions and API gateway...');

    // gets all functions from functions folder and zips them into an 'archives' folder
    await zipFunctions(functionsFolder, "archives");
    const zippedFunctions = fs.readdirSync("archives");

    for (const func of zippedFunctions) {
      await JOLT.deployLambda(func, bucket, lambdaRole);
    }

    await this.api.createStage(version);
    await this.api.deploy(version, gatewayDescription);

    return Promise.resolve(`https://${this.api.apiId}.execute-api.${AWS_REGION}.amazonaws.com/${version}`);
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   *   @returns {Promise<{gatewayUrl}>} return an object with the gatewayURl inside.
   */

  static async deployLambdasAndGateway(bucket) {
    const { buildInfo, AWSInfo } = this.config;
    const {
      AWS_REGION,
      apiName,
      gatewayStage,
      gatewayDescription,
    } = AWSInfo;

    const version = this.#deployment.version;
    const { functionsFolder } = buildInfo;

    this.api = new Gateway(apiName, AWS_REGION, version);
    await this.api.create();
    JOLT.#deployment.api = this.api;

    const iam = new Iam(AWS_REGION);
    const lambdaRole = await iam.createLambdaRole();

    console.log('Creating functions and API gateway...');

    // gets all functions from functions folder and zips them into an 'archives' folder

    await zipFunctions(functionsFolder, "archives");
    const zippedFunctions = fs.readdirSync("archives");

    for (const func of zippedFunctions) {
      await JOLT.deployLambda(func, bucket, lambdaRole);
    }

    await this.api.createStage(version);
    await this.api.deploy(version, gatewayDescription);

    return Promise.resolve(`https://${this.api.apiId}.execute-api.${AWS_REGION}.amazonaws.com/${version}`);
  }

  static async redeployStaticAssets(bucketName, files) {
    let bucket = new S3(bucketName);

    for (const file of files) {
      await bucket.reuploadObject(file);
    }

  }

  static async deployLambda(func, bucket, lambdaRole) {
    const funcName = path.basename(func, ".zip");
    const funcPath = `archives/${func}`;

    let functionsFolder = this.config.buildInfo.functionsFolder;
    let secrets = fetchLocalSecrets(functionsFolder + "/" + func.replace("-", "/"), funcName)
    let zippedFileBuffer = fs.readFileSync(funcPath);

    await bucket.uploadObject(zippedFileBuffer, funcPath);

    const lambda = new Lambda(bucket.bucketName, funcPath);

    let arn = await lambda.create(lambdaRole, secrets);
    this.deployment.lambdas.push(arn);
    // **TODO**: should be able to configure the method for each lambda
    const methods = [
      "OPTIONS",
      "GET",
      "PUT",
      "PATCH",
      "DELETE",
      "POST",
      "HEAD",
    ];

    // adds each method to each route
    for (const method of methods) {
      await this.api.addRoute(method, funcName.replace(/-/g, "/"), funcName, arn);
    }
  }

  static toFuncName(path) {
    return path.split("/").slice(1).join("/").split(".").slice(0, -1).join(".");
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   */
  static async deployStaticAssets(bucket) {
    const { buildInfo } = this.config;
    const { buildFolder } = buildInfo;
    console.log("Adding files...")
    await walkDirs(buildFolder, async (path) => {
      let data = fs.readFileSync(path);
      const file = await bucket.uploadObject(data, path, true);
      if (file) JOLT.#deployment.files.push(file);
    });

    console.log("All files added.");
  }

  static createProxy(gatewayUrl) {
    return `exports.handler = (event, _, callback) => {
      let request = event.Records[0].cf.request;
      let path = request.uri.split("/").slice(2).join("/");
      let url = "${gatewayUrl}/" + path;

      callback(null, {
        status: '307',
        statusDescription: 'Temporary Redirect',
        headers: {
            location: [{
                key: 'Location',
                value: url,
            }],
        },
      });
    };`;
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   *   @param {string} apiUrl the gateway api url that will be used to deploy the edge lambda.
   *   @returns {Promise<{gatewayUrl}>} return an object with the gatewayURl inside.
   */
  static async deployEdgeLambda(bucket, gatewayUrl) {
    const zipper = new Zip();
    const func = this.createProxy(gatewayUrl);

    console.log("Creating edge lambda...");

    zipper.addFile(`edge-proxy.js`, Buffer.alloc(func.length, func));
    const proxy = zipper.toBuffer();

    await bucket.uploadObject(proxy, `edge-proxy.zip`);
    const iam = new Iam();
    const edgeArn = await iam.createEdgeRole("therole");

    const edgelambda = new Lambda(bucket.bucketName, `edge-proxy.zip`);
    let proxyArn = await edgelambda.create(edgeArn);
    if (!edgelambda.versioned) {
      await edgelambda.deployVersion();
      proxyArn = `${edgelambda.arn}:${edgelambda.version}`;
    }
    JOLT.#deployment.edgeLambdas.push(proxyArn);

    console.log("Edge lambda successfully deployed");
    return Promise.resolve({ proxyArn });
  }

  // /**
  //  * @param {string} bucket the bucket that will act as the origin
  //  * @param {string} ProxyArn the arn for the edge lambda
  //  * @param {string} callerReference a caller reference for the distribution
  //  * @returns {Promise<distribution>} returns the distribution
  //  */

  static async deployToCloudFront(bucket, proxyArn, callerReference) {
    const { AWS_REGION } = this.config.AWSInfo;
    callerReference = callerReference + uniqueId();
    let client = new CloudFrontWrapper(AWS_REGION);
    let distribution = await client.createDistribution(
      bucket.bucketName + ".s3.amazonaws.com",
      bucket.bucketName,
      proxyArn,
      callerReference
    );
    return Promise.resolve({ distribution });
  }

  static async invalidateDistribution(distributionId) {
    const { AWS_REGION } = this.config.AWSInfo;
    let cf = new CloudFrontWrapper(AWS_REGION);
    let distribution = await cf.invalidateDistribution(distributionId);
    return Promise.resolve(distribution);
  }
}

module.exports = JOLT;
