const Lambda = require("./lambroghinis/lambdas");
const Gateway = require("./gateway/gateway");
const S3 = require("./owens-super-awesome-s3/s3");
const WalkDirs = require("./useful-utilities/walkDirs");
const fs = require("fs");
const Zip = require("adm-zip");

const deployLambdasAndGateway = async (bucket, functionsFolder, apiName="testApi") => {
  const toFuncName = (path) => {
    return path.split("/").slice(1).join("/").split(".").slice(0,-1).join(".");
  }

  const toFileName = (funcName, extension) => {
    return funcName.replace("/", "-") + extension;
  }

  const api = new Gateway(apiName);
  await api.create(apiName);

  await WalkDirs(functionsFolder, async (path) => {
    const funcName = toFuncName(path);
    let data = fs.readFileSync(path);

    const zipper = new Zip();

    zipper.addFile(toFileName(funcName, ".js"), data);

    const zippedFileBuffer = zipper.toBuffer();
    await bucket.uploadObject(zippedFileBuffer, toFileName(funcName, ".zip"));
    const lambda = await new Lambda(bucketName, toFileName(funcName, ".zip"));

    let a = await lambda.create();

    await api.addRoute("ANY", funcName, toFileName(funcName));
  });

  await api.createStage("test");
  await api.deploy("test", "test");
  return { GatewayUrl: api.url };
}

// module.exports = deployLambdasAndGateway;