const Lambda = require("./lambroghinis/lambdas");
const Gateway = require("./gateway/gateway");
const S3 = require("./owens-super-awesome-s3/s3");
const WalkDirs = require("./useful-utilities/walkDirs");
const fs = require("fs");
const zip = require("adm-zip");

const toFuncName = (path) => path.split("/").slice(1).join("/").split(".").slice(0,-1).join(".");
const toFileName = (funcName, extension) => funcName.replace("/", "-") + extension;
const deploy = async () => {
  const BUCKET_NAME = "test-functions-bucket-0320507";
  const bucket = new S3(BUCKET_NAME);
  await bucket.createBucket();
  const api = new Gateway("test-functions-multiple-paths");
  await api.create();
  let routes = [];
  await WalkDirs("functions", async (path) => {
    const funcName = toFuncName(path);
    let data = fs.readFileSync(path);

      const zipper = new zip();

      zipper.addFile(toFileName(funcName, ".js"), data);

      const buffer = zipper.toBuffer();
      await bucket.uploadObject(buffer, toFileName(funcName, ".zip"));
      const lambda = await new Lambda(BUCKET_NAME, toFileName(funcName, ".zip"));
      let a = await lambda.create();

      await api.addRoute("ANY", funcName, toFileName(funcName));
    });

  await api.createStage("test");
  await api.deploy("test", "test");

}

deploy();