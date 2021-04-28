const config = require("./config.json");
const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");
const Teardown = require('../Teardown/teardown')
const Dynamo = require('../Dynamo/dynamo');
const Gateway = require("../APIGateway/gateway");
const { bucket: bucketName, buildCommand, region} = config.deploy;
const { tableName, projectName, cloudfrontId, gatewayUrl } = config;
let deployment = {
  tableName,
  projectName,
  lambdas: [],
  edgeLambdas: []
};
const run = async () => {
  try {
    console.log("Building started");

    const builder = new Builder(buildCommand);
    await builder.build();
    // REMOVE THIS LATER
    const builder2 = new Builder("cd Demo && mv -r build ../");
    await builder2.build();
    // END REMOVE THIS LATER
    console.log("Build completed!");
  } catch (error) {
    console.log("Failed to complete build process");
    // console.log(error.message);
    throw new Error(error.message);
  }


  let torn = false
  deployment.deployed = false;
  let db = new Dynamo();
  try {
    const ref = "CORE-Jamstack:" + uuid.v4();
    const bucket = new S3(bucketName);
    await bucket.createBucket();
    deployment.region = region
    deployment.bucket = bucketName
    const res = await CORE.updateLambdas(bucket, deployment);
    await CORE.deployStaticAssets(bucket, deployment);
    const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl, deployment);
    
    const cloudfrontRes = await CORE.invalidateDistribution(cloudfrontId);
    console.log("from cloudfront:", cloudfrontRes)
    deployment.cloudfrontId = cloudfrontId
    console.log("Successfully deployed application find it here:\n", domainName);
    deployment.deployed = true;
  } catch (error) {

    console.log("unable to complete distribution, process failed because: ", error.message);
    console.log("initiating teardown... ");
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    console.log("teardown completed.");
  }

  if (!torn && !deployment.deployed) {
    let teardown = new Teardown(deployment)
    await teardown.all();
  } else if (deployment.deployed) {
    await db.createTable(deployment.tableName)
    await db.addItemsToTable(deployment.tableName, deployment)
  }
  
  console.log("the deployment: ", deployment);
  
  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};

run();
