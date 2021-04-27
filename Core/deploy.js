const config = require("./config.json");
const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");
const Teardown = require('../Teardown/teardown')
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

  try {
    const ref = "CORE-Jamstack:" + uuid.v4();
    const bucket = new S3(bucketName);
    await bucket.createBucket();
    deployment.region = region
    deployment.bucket = bucketName
    // await CORE.deployStaticAssets(bucket, deployment);
    const { gatewayUrl } = await CORE.deployLambdasAndGateway(bucket, deployment);
    // const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl, deployment);
    // throw new Error("removing all functions and api gateway");
    // throw new Error("just coz i want to")
    // const { distribution } = await CORE.deployToCloudFront(bucket, proxyArn, ref, deployment);
    // deployment.cloudfrontId = distribution.Id
    // const { DomainName: domainName } = distribution;
    // console.log("Successfully deployed application find it here:\n", domainName);

  } catch (error) {
    console.log("unable to complete distribution, process failed because: ", error.message);
    console.log("initiating teardown... ");
    // deployment.lambdas = undefined;
    let teardown = new Teardown(deployment)
    await teardown.all()
    console.log("teardown completed.")
  }
  // dynamo.add(appName, deployment)
  console.log("the deployment: ", deployment)
  // let teardown = new Teardown(deployment)
  // await teardown.all();
  
  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};

run();
