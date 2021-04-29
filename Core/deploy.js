const config = require("./config.json");
const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");
const Teardown = require('../Teardown/teardown')
const Dynamo = require('../Dynamo/dynamo');
const Gateway = require("../APIGateway/gateway");
const { bucket: bucketName, buildCommand, region } = config.deploy;
const { tableName, projectName } = config;


const buildProcess = async () => {
    console.log("Building started");

    const builder = new Builder(buildCommand);
    await builder.build();
    // REMOVE THIS LATER
    const builder2 = new Builder("cd Demo && mv -r build ../");
    await builder2.build();
    // END REMOVE THIS LATER
    console.log("Build completed!");
}

const createDeployment = async (deployment) => {
  const ref = "CORE-Jamstack:" + uuid.v4();
  const bucket = new S3(bucketName, deployment);
  await bucket.createBucket();
  deployment.region = region
  deployment.bucket = bucketName
  CORE.deployment = deployment;
  await CORE.deployStaticAssets(bucket);
  const { gatewayUrl } = await CORE.deployLambdasAndGateway(bucket);
  const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);

  const { distribution } = await CORE.deployToCloudFront(bucket, proxyArn, ref);
  deployment.cloudfrontId = distribution.Id
  const { DomainName: domainName } = distribution;
  deployment.domainName = domainName
  console.log("Successfully deployed application find it here:\n", domainName);
  deployment.deployed = true;
}

const sendToDB = async (deployment) => {
  if (!deployment.deployed) {
    let teardown = new Teardown(deployment)
    await teardown.all();
    return;
  }

  let db = new Dynamo();
  await db.createTable(deployment.tableName)
  await db.addItemsToTable(deployment.tableName, deployment)
}


const run = async (deployment) => {

  try {
    await buildProcess()
  } catch (error) {
    console.log("Failed to complete build process");
    throw new Error(error.message);
  }
  let torn = false
  deployment.deployed = false;

  try {
    await createDeployment(deployment)
  } catch (error) {
    torn = true;
    await teardown(
      "unable to complete distribution, process failed because: ",
      error,
      deployment
    );

  }
  try {
    if (!torn) await sendToDB(deployment)
  } catch (error) {
    await teardown(
      "unable to send to database, process failed because: ",
      error,
      deployment
    );
  }

  console.log("the deployment: ", deployment);

  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};

const teardown = async (message, error, deployment) => {
  console.log(message, error.message);
  console.log("initiating teardown... ");
  let teardown = new Teardown(deployment);
  await teardown.all();
  torn = true;
  console.log("teardown completed.");
}
const createDeploymentTemplate = () => ({
  tableName,
  projectName,
  files: [],
  lambdas: [],
  edgeLambdas: []
});


run(createDeploymentTemplate());
