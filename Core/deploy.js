const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
// const uuid = require("uuid");
const Teardown = require("../Teardown/teardown");
const Dynamo = require("../Dynamo/dynamo");
// const Gateway = require("../APIGateway/gateway");
// const uniqueId = require("../Utilities/nanoid");
let config;

const getConfig = () => require(process.env.PWD + "/config.json");
// const { bucket: bucketName, buildCommand, region } = config.deploy;
// const { tableName, projectName } = config;

const buildProcess = async () => {
  if (!config) config = getConfig();
  const { buildInfo } = config;

  console.log("setting up dependencies");
  const { setupCommand, buildCommand } = buildInfo;
  const setup = new Builder(setupCommand);
  await setup.build();

  const build = new Builder(buildCommand);
  await build.build();

  console.log("Build completed!");
};

const deploymentProcess = async (deployment) => {
  if (!config) config = getConfig();
  CORE.config = config;
  const { bucketName, AWS_REGION } = config.AWSInfo;
  const { projectId } = config.projectInfo;

  const bucket = new S3(bucketName, deployment);
  await bucket.createBucket();

  deployment.region = AWS_REGION;
  deployment.bucket = bucketName;
  CORE.deployment = deployment;

  const { gatewayUrl } = await CORE.deployLambdasAndGateway(bucket);
  
  await CORE.deployStaticAssets(bucket);

  const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);
  const { distribution } = await CORE.deployToCloudFront(bucket, proxyArn, projectId);

  deployment.cloudfrontId = distribution.Id
  const { DomainName: domainName } = distribution;
  deployment.domainName = domainName
  console.log("Successfully deployed application. Find it here:\n", domainName);
  deployment.deployed = true;
}

const sendToDB = async (deployment) => {
  if (!deployment.deployed) {
    let teardown = new Teardown(deployment)
    await teardown.all();
    return;
  }
  console.log("Sending deployment info to the DynamoDB");
  let db = new Dynamo();
  await db.createTable(deployment.tableName)
  await db.addItemsToTable(deployment.tableName, deployment)
  console.log("Deployment successfully recorded in DynamoDB");
}


let torn;// kept here so it's clear where it's changed
const teardown = async (message, error, deployment) => {
  try { 
    console.log(message, error.message);
    console.log("initiating teardown... ");
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    console.log("teardown completed.");
  } catch (error) {
    console.log("unable to tear down, here is the deployment", deployment)
  }
}

const createDeploymentTemplate = () => {
  if (!config) config = getConfig();
  const { projectId: tableName, projectName } = config.projectInfo;
  return ({
    tableName,
    projectName,
    files: [],
    lambdas: [],
    edgeLambdas: []
  })
};


const run = async () => {
  try {
    await buildProcess()
  } catch (error) {
    return console.log("unable to build the project, error: ", error.message)
  }

  const deployment = createDeploymentTemplate();
  try {
    await deploymentProcess(deployment);
  } catch (error) {
    torn = true;
    return teardown("unable to provision resources", error, deployment)
  }

  try {
    if(!torn) await sendToDB(deployment);
  } catch (error) {
    return teardown("unable to store deployment in the database", error, deployment)
  }

  console.log("the deployment ", deployment)
}

module.exports = run;
