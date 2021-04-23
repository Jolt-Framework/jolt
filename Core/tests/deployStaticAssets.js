const Lambda = require("./lambroghinis/lambdas");
const Gateway = require("./gateway/gateway");
const S3 = require("./owens-super-awesome-s3/s3");
const WalkDirs = require("./useful-utilities/walkDirs");
const fs = require("fs");

const toFuncName = (path) => {
  return path.split("/").slice(1).join("/").split(".").slice(0,-1).join(".");
}

const toFileName = (funcName, extension) => {
  return funcName.replace("/", "-") + extension;
}

const deployStaticAssets = async (bucket, buildFolder) => {
  await WalkDirs(buildFolder, async (path) => {
    const funcName = toFuncName(path);
    let data = fs.readFileSync(path);

    await bucket.uploadObject(data, toFileName(funcName, ".zip"));
  });
}