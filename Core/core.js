const Lambda = require("../Lambda/lambda");
const CloudFrontWrapper = require("../CloudFront/cloudfront");
const Gateway = require("../APIGateway/gateway");
const Iam = require("../IAM/iam");
const walkDirs = require("../Utilities/walkDirs");
const fs = require("fs");
const Zip = require("adm-zip");
const uuid = require("uuid");
const config = require("./config.json");
const { zipFunction } = require("../Utilities/zip-it-and-ship-it/src/main");

class CORE {
  static toFuncName(path) {
    return path.split("/").slice(1).join("/").split(".").slice(0, -1).join(".");
  }

  static toFileName(funcName, extension) {
    return funcName.replace("/", "-") + extension;
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   *   @returns {Promise<{gatewayUrl}>} return an object with the gatewayURl inside.
   */
  
  static async updateLambdas(bucket, deployment) {
    const {
      functionsFolder
    } = config.core;

    const iam = new Iam();
    const lambdaRole = await iam.createLambdaRole();

    await walkDirs(functionsFolder, async (path) => {
      const funcName = this.toFuncName(path);
      await zipFunction(path, "archives");

      let zippedFileBuffer = fs.readFileSync(
        path.replace("functions", "archives").replace(".js", ".zip")
      );

      await bucket.uploadObject(
        zippedFileBuffer,
        this.toFileName(funcName, ".zip")
      );
      const lambda = new Lambda(
        bucket.bucketName,
        this.toFileName(funcName, ".zip")
      );

      let arn = await lambda.create(lambdaRole);
      
      deployment.lambdas.push(arn)
    }) 
  }
  static async deployLambdasAndGateway(bucket, deployment) {
    const {
      region,
      functionsFolder,
      apiName,
      gatewayStage,
      gatewayDescription,
    } = config.core; // will later need a relative path to the functions folder along with the name.
    const api = new Gateway(apiName);
    await api.create(apiName);
    deployment.api = api
    const iam = new Iam();
    const lambdaRole = await iam.createLambdaRole();

    await walkDirs(functionsFolder, async (path) => {
      const funcName = this.toFuncName(path);
      await zipFunction(path, "archives");

      let zippedFileBuffer = fs.readFileSync(
        path.replace("functions", "archives").replace(".js", ".zip")
      );

      // const zipper = new Zip();

      // zipper.addFile(this.toFileName(funcName, ".js"), data);

      // const zippedFileBuffer = zipper.toBuffer();
      await bucket.uploadObject(
        zippedFileBuffer,
        this.toFileName(funcName, ".zip")
      );
      const lambda = new Lambda(
        bucket.bucketName,
        this.toFileName(funcName, ".zip")
      );

      let arn = await lambda.create(lambdaRole);
      
      deployment.lambdas.push(arn)
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

      for (const method of methods) {
        await api.addRoute(method, funcName, this.toFileName(funcName, ""));
      }
    });
    await api.createStage(gatewayStage);
    await api.deploy(gatewayStage, gatewayDescription);
    this.api = api;
    return Promise.resolve({
      gatewayUrl:
        `https://${api.apiId}.execute-api.${region}.amazonaws.com/` + "test",
    });
  }

  /**
   *   @param {S3Object} bucket the bucket client created by new S3
   */
  static async deployStaticAssets(bucket) {
    const { buildFolder } = config.core;
    await walkDirs(buildFolder, async (path) => {
      let data = fs.readFileSync(path);
      await bucket.uploadObject(data, path, true);
    });
  }

  static createProxy(apiUrl) {
    return `exports.handler = (event, _, callback) => {
      let request = event.Records[0].cf.request;
      let path = request.uri.split("/").slice(2).join("/");
      let url = "${apiUrl}/" + path;

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
  static async deployEdgeLambda(bucket, apiUrl, deployment) {
    const zipper = new Zip();
    const func = this.createProxy(apiUrl);
    const name = uuid.v4();

    zipper.addFile(`edge-proxy.js`, Buffer.alloc(func.length, func));

    const proxy = zipper.toBuffer();

    await bucket.uploadObject(proxy, `edge-proxy.zip`);
    const iam = new Iam();
    const edgeArn = await iam.createEdgeRole("therole");
    const edgelambda = new Lambda(bucket.bucketName, `edge-proxy.zip`);
    let proxyArn = await edgelambda.create(edgeArn);
    console.log("proxy arn: ", proxyArn)
    console.log("is versioned? ", edgelambda.versioned)
    if (!edgelambda.versioned) {
      await edgelambda.deployVersion();
      console.log("reached versioning");
      proxyArn = `${edgelambda.arn}:${edgelambda.version}`
    }
    deployment.edgeLambdas.push(proxyArn)
    // console.log(edgelambda.arn + ":" + edgelambda.version); // debugging step

    return Promise.resolve({ proxyArn });
  }

  /**
   *
   * @param {string} bucket the bucket that will act as the origin
   * @param {string} ProxyArn the arn for the edge lambda
   * @param {string} callerReference a caller reference for the distribution
   * @returns {Promise<distribution>} returns the distribution
   */

  static async deployToCloudFront(bucket, proxyArn, callerReference) {
    const { region } = config.core;
    let client = new CloudFrontWrapper(region);
    let distribution = await client.createDistribution(
      bucket.bucketName + ".s3.amazonaws.com",
      bucket.bucketName,
      proxyArn,
      callerReference
    );
    return Promise.resolve({ distribution });
  }
  static async invalidateDistribution(distributionId, proxyARN) {
    const { region } = config.core;
    let cf = new CloudFrontWrapper(region)
    const { Etag, DistributionConfig } = await cf.getDistribution(distributionId)
    DistributionConfig.CacheBehaviors.LambdaFunctionAssociations = {
      Quantity: "1",
      Items: [
        {
          EventType: "viewer-request",//types.EventTypeViewerRequest
          LambdaFunctionARN: proxyARN,
          IncludeBody: true,
        },
      ],      
    }
    
    let { Distribution: distribution } = await cf.client.updateDistribution({
      Id: distributionId,
      ifMatch: Etag,
      DistributionConfig
    })
    let confirmation = await cf.client.createInvalidation({
      DistributionId: distributionId
    })

    return Promise.resolve({...confirmation, ...distribution});
  }

  static async updateCors(domainName) {
    try {
      await this.api.updateCors(domainName);
      console.log("successfully updated cors");
    } catch (error) {
      console.log("unable to create cors");
      throw new Error(error.message);
    }
  }
}

module.exports = CORE;
