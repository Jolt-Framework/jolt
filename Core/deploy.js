const config = require("./config.json");
const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");
const Teardown = require('../Teardown/teardown')
// const Dynamo = require('../Dynamo/dynamo');
const { bucket: bucketName, buildCommand, region} = config.deploy;
const deployment = {
  lambdas: [],
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
  try {
    const ref = "CORE-Jamstack:" + uuid.v4();
    const bucket = new S3(bucketName);
    await bucket.createBucket();
    deployment.region = region
    deployment.bucket = bucketName
    const { gatewayUrl } = await CORE.deployLambdasAndGateway(bucket, deployment);
    await CORE.deployStaticAssets(bucket, deployment);
    throw new Error("for max")
    const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl, deployment);
    
    const { distribution } = await CORE.deployToCloudFront(bucket, proxyArn, ref, deployment);
    deployment.cloudfrontId = distribution.Id
    const { DomainName: domainName } = distribution;
    deployment.domainName = domainName
    console.log("Successfully deployed application find it here:\n", domainName);
    deployment.deployed = true;
  } catch (error) {
    console.log("unable to complete distribution, process failed because: ", error.message);
    console.log("initiating teardown... ");
    // deployment.lambdas = undefined;
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    console.log("teardown completed.");
  }
  // dynamo.add(appName, deployment)
  if (!torn && !deployment.deployed) {
    let teardown = new Teardown(deployment)
    await teardown.all();
  }



  console.log("the deployment: ", deployment);
  
  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};

run();
