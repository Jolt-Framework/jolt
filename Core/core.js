const Lambda = require("../Lambda/lambda");
const CloudFrontWrapper = require("../CloudFront/cloudfront");
const Gateway = require("../APIGateway/gateway");
const Iam = require("../IAM/iam");
const walkDirs = require("../Utilities/walkDirs");
const fs = require("fs");
const Zip = require("adm-zip");
const path = require("path");
// const config = require("./config.json");
const { zipFunctions } = require("../Utilities/zip-it-and-ship-it/src/main");
const uniqueId = require("../Utilities/nanoid");

class CORE {
  static #deployment;

  static get deployment() {
    return CORE.#deployment;
  }

  static set deployment(deployment) {
    CORE.#deployment = deployment;
  }

  static toFuncName(path) {
    return path.split("/").slice(1).join("/").split(".").slice(0, -1).join(".");
  }

  static toFileName(funcName, extension) {
    return funcName.replace("/", "-") + extension;
  }

  /**
   *  
   * 
   */

  // static async updateLambdasAndGateway(bucket, api) {
  //   const { apiId, apiName } = api;
  //   const { functionsFolder, gatewayStage} = config.core;

  //   const iam = new Iam();
  //   const lambdaRole = await iam.createLambdaRole();

  //   await walkDirs(functionsFolder, async (path) => {
  //     const funcName = this.toFuncName(path);
  //     await zipFunction(path, "archives");

  //     let zippedFileBuffer = fs.readFileSync(
  //       path.replace("functions", "archives").replace(".js", ".zip")
  //     );

  //     await bucket.uploadObject(
  //       zippedFileBuffer,
  //       this.toFileName(funcName, ".zip")
  //     );

  //     const lambda = new Lambda(
  //       bucket.bucketName,
  //       this.toFileName(funcName, ".zip")
  //     );

  //     let arn = await lambda.create(lambdaRole);
  //     CORE.#deployment.lambdas.push(arn);
  //   });

  //   let gateway = new Gateway(apiName, gatewayStage)
  //   let res = await gateway.update(apiId);
  //   return Promise.resolve(res);
  // }

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
    const { functionsFolder } = buildInfo;

    this.api = new Gateway(apiName, AWS_REGION, gatewayStage);
    await this.api.create();
    CORE.#deployment.api = this.api;

    const iam = new Iam(AWS_REGION);
    const lambdaRole = await iam.createLambdaRole();
    
    console.log('Creating functions and API gateway...');

    // gets all functions from functions folder and zips them into an 'archives' folder
    await zipFunctions(functionsFolder, "archives");
    const zippedFunctions = fs.readdirSync("archives");

    for (const func of zippedFunctions) {
      await CORE.sendLambdaToBucket(func, bucket, lambdaRole);
    }

    await this.api.createStage(gatewayStage);
    await this.api.deploy(gatewayStage, gatewayDescription);

    return Promise.resolve({
      gatewayUrl:
        `https://${this.api.apiId}.execute-api.${AWS_REGION}.amazonaws.com/${gatewayStage}`
    });
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   *   @param {string} func the name of the function
   *   @param {LambdaRole} lambdaRole the lambda role
   */

  static async sendLambdaToBucket(func, bucket, lambdaRole) {
    const funcName = path.basename(func, ".zip");
    const funcPath = `archives/${func}`;
    // console.log("funcName is ", funcName)
    // console.log("funcPath is ", funcPath)

    let zippedFileBuffer = fs.readFileSync(funcPath);

    await bucket.uploadObject(zippedFileBuffer, funcPath);

    const lambda = new Lambda(bucket.bucketName, funcPath);

    let arn = await lambda.create(lambdaRole);
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

    // await methods.forEach(async method => {
    //   await api.addRoute(method, funcName, this.toFileName(funcName, "" ))
    // }) getNotes-functionId
    // adds each method to each route
    for (const method of methods) {
      await this.api.addRoute(method, funcName.replace("-", "/"), funcName);
    }
  }

  static toFuncName(path) {
    return path.split("/").slice(1).join("/").split(".").slice(0, -1).join(".");
  }
    // await walkDirs(functionsFolder, async (path) => {
    //   const funcName = this.toFuncName(path);
    //   await zipFunction(path, "archives");

    //   let zippedFileBuffer = fs.readFileSync(
    //     path.replace("functions", "archives").replace(".js", ".zip")
    //   );

    //   // const zipper = new Zip();

    //   // zipper.addFile(this.toFileName(funcName, ".js"), data);

    //   // const zippedFileBuffer = zipper.toBuffer();
    //   await bucket.uploadObject(
    //     zippedFileBuffer,
    //     this.toFileName(funcName, ".zip")
    //   );
    //   const lambda = new Lambda(
    //     bucket.bucketName,
    //     this.toFileName(funcName, ".zip")
    //   );

    //   let arn = await lambda.create(lambdaRole);

    //   CORE.#deployment.lambdas.push(arn);
    //   // **TODO**: should be able to configure the method for each lambda
    //   const methods = [
    //     "OPTIONS",
    //     "GET",
    //     "PUT",
    //     "PATCH",
    //     "DELETE",
    //     "POST",
    //     "HEAD",
    //   ];

    //   for (const method of methods) {
    //     await api.addRoute(method, funcName, this.toFileName(funcName, ""));
    //   }
    // });

    // await api.createStage(gatewayStage);
    // await api.deploy(gatewayStage, gatewayDescription);
    // this.api = api;
    // console.log("functions and api gatway deployed to stage: /", gatewayStage)
    // return Promise.resolve({
    //   gatewayUrl:
    //     `https://${api.apiId}.execute-api.${region}.amazonaws.com/` + "test",
    // });
  // }

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
      if (file) CORE.#deployment.files.push(file);
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
    CORE.#deployment.edgeLambdas.push(proxyArn);

    console.log("Edge lambda successfully deployed");
    return Promise.resolve({ proxyArn });
  }

  // /**
  //  *
  //  * @param {string} bucket the bucket that will act as the origin
  //  * @param {string} ProxyArn the arn for the edge lambda
  //  * @param {string} callerReference a caller reference for the distribution
  //  * @returns {Promise<distribution>} returns the distribution
  //  */

  static async deployToCloudFront(bucket, proxyArn, callerReference) {
    const { AWS_REGION } = this.config.AWSInfo;
    callerReference = callerReference + uniqueId()
    let client = new CloudFrontWrapper(AWS_REGION);
    let distribution = await client.createDistribution(
      bucket.bucketName + ".s3.amazonaws.com",
      bucket.bucketName,
      proxyArn,
      callerReference
    );
    return Promise.resolve({ distribution });
  }

  static async invalidateDistribution(distributionid) {
    const { AWS_REGION } = this.config.AWSInfo;
    let cf = new CloudFrontWrapper(AWS_REGION);
    let distribution = await cf.invalidateDistribution(distributionId);
    return Promise.resolve(distribution);
  }
  
  // may be used later - don't delete yet
  // static async updateCors(domainName) { 
  //   try {
  //     await this.api.updateCors(domainName);
  //     console.log("successfully updated cors");
  //   } catch (error) {
  //     console.log("unable to create cors");
  //     throw new Error(error.message);
  //   }
  // }
}

module.exports = CORE;
