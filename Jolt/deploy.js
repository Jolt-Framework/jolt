const S3 = require("../aws/s3");
const JOLT = require("./jolt");
const Builder = require("../Utilities/builder");
const Teardown = require("../Utilities/Teardown/teardown");
const Dynamo = require("../aws/dynamo");
const loadConfig = require("../Utilities/loadConfig");

const buildProcess = async () => {
  const config = loadConfig();
  const { buildInfo } = config;

  log("setting up dependencies");
  const { setupCommand, buildCommand } = buildInfo;
  const setup = new Builder(setupCommand);
  await setup.build();

  const build = new Builder(buildCommand);
  await build.build();

  log("Build completed!");
};

const deploymentProcess = async (deployment) => {
  const config = loadConfig();
  JOLT.config = config;
  const { bucketName, AWS_REGION } = config.AWSInfo;
  const { projectId } = config.projectInfo;

  const bucket = new S3(bucketName, deployment);
  await bucket.createBucket();

  deployment.region = AWS_REGION;
  deployment.bucket = bucketName;
  JOLT.deployment = deployment;

  const gatewayUrl = await JOLT.deployLambdasAndGateway(bucket);

  await JOLT.deployStaticAssets(bucket);

  const { proxyArn } = await JOLT.deployEdgeLambda(bucket, gatewayUrl);
  const { distribution } = await JOLT.deployToCloudFront(bucket, proxyArn, projectId);

  deployment.cloudfrontId = distribution.Id
  const { DomainName: domainName } = distribution;
  deployment.domainName = domainName;
  log("Successfully deployed application. Find it here:\n", domainName);
  deployment.deployed = true;
}

const sendToDB = async (deployment) => {
  if (!deployment.deployed) {
    let teardown = new Teardown(deployment);
    await teardown.all();
    return;
  }
  log("Sending deployment info to the DynamoDB");
  let db = new Dynamo();
  delete deployment.api.client;
  await db.createTable(deployment.tableName);
  await db.addDeploymentToTable(deployment.tableName, deployment);
  log("Deployment successfully recorded in DynamoDB");
}


let torn;// kept here so it's clear where it's changed
const teardown = async (message, error, deployment) => {
  try {
    log(message, error.message);
    log("initiating teardown... ");
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    log("teardown completed.");
  } catch (error) {
    log("unable to tear down, here is the deployment", deployment);
  }
}

const createDeploymentTemplate = async (description) => {
  const config = loadConfig();
  const { projectId: tableName, projectName } = config.projectInfo;

  let db = new Dynamo();
  let version = await db.getNextVersionNumber(tableName);

  return ({
    tableName,
    projectName,
    files: [],
    lambdas: [],
    edgeLambdas: [],
    version,
		description
  });
};

const removeArtifacts = async () => {
  const config = loadConfig();
  let arch = new Builder("rm -rf archives");
  await arch.build();
  let build = new Builder(`rm -rf ${config.buildInfo.buildFolder}`);
  await build.build();
}

const run = async (deploymentDescription) => {
	try {
		await removeArtifacts();
		await buildProcess();
	} catch (error) {
		return log("unable to build the project, error: ", error.message);
	}

  const deployment = await createDeploymentTemplate(deploymentDescription);
  try {
    await deploymentProcess(deployment);
  } catch (error) {
    torn = true;
    return teardown("unable to provision resources", error, deployment);
  }

  try {
    if(!torn) await sendToDB(deployment);
  } catch (error) {
    return teardown("unable to store deployment in the database", error, deployment);
  }

  await removeArtifacts();
}

module.exports = run;
function log(...text) {
  log(...text);
}

