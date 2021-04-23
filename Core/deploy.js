const config = require("./config.json");
const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");

const { bucket: bucketName, buildCommand } = config.deploy;

const run = async () => {
  try {
    console.log("Building started");

    // let commands = buildCommand.split(" && ")

    // commands.forEach(async command => {
    //   const builder = new Builder(command);
    //   await builder.build();
    // })

    const builder = new Builder(buildCommand);
    await builder.build();
    console.log("Build completed!");
    // const builder = new Builder(buildCommand);
    // await builder.build();
  } catch (error) {
    console.log("Failed to complete build process");
    // console.log(error.message);
    throw new Error(error.message);
  }
  const ref = "CORE-Jamstack:" + uuid.v4();
  const bucket = new S3(bucketName);
  await bucket.createBucket();

  const { gatewayUrl } = await CORE.deployLambdasAndGateway(bucket);

  await CORE.deployStaticAssets(bucket);
  const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);
  const { distribution } = await CORE.deployToCloudFront(bucket, proxyArn, ref);

  const { DomainName: domainName} = distribution;
  console.log("Successfully deployed application find it here:\n", domainName);

  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};

run();
