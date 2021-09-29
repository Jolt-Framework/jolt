const S3 = require("../aws/s3");
const JOLT = require("./jolt");
const Builder = require("../Utilities/builder");
const Teardown = require("../Utilities/Teardown/teardown");
const Dynamo = require("../aws/dynamo");
const loadConfig = require("../Utilities/loadConfig");
const log = (text) => console.log(`\x1b[32m✔\x1b[0m ${text}`);
const errlog = (text) => console.log(`\x1b[31m✘\x1b[0m ${text}`);

const buildProcess = async () => {
  const config = loadConfig();
  const { buildInfo } = config;

  log("Installing dependencies...");
  const { setupCommand, buildCommand } = buildInfo;
  const setup = new Builder(setupCommand);
  await setup.build();
  log("Dependencies installed");

  const build = new Builder(buildCommand);
  await build.build();

  log("Build completed");
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
  log(`Successfully deployed application. View it here: ${domainName}`);
  deployment.deployed = true;
}

const sendToDB = async (deployment) => {
  if (!deployment.deployed) {
    let teardown = new Teardown(deployment);
    await teardown.all();
    return;
  }
  log("Sending deployment info to DynamoDB...");
  let db = new Dynamo();
  delete deployment.api.client;
  await db.createTable(deployment.tableName);
  await db.addDeploymentToTable(deployment.tableName, deployment);
  log("Deployment successfully recorded in DynamoDB");
}


let torn;
const teardown = async (message, error, deployment) => {
  try {
    errlog(`${message}: ${error.message}`);
    errlog("Initiating teardown...");
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    log("Teardown completed.");
  } catch (error) {
    errlog(`Unable to tear down: Deployment details: ${deployment}`);
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
		return errlog(`Unable to build the project, error: ${error.message}`);
	}

  const deployment = await createDeploymentTemplate(deploymentDescription);
  try {
    await deploymentProcess(deployment);
  } catch (error) {
    torn = true;
    return teardown("Unable to provision resources", error, deployment);
  }

  try {
    if(!torn) await sendToDB(deployment);
  } catch (error) {
    return teardown("Unable to store deployment in the database", error, deployment);
  }

  await removeArtifacts();
  log("Deployment complete!");
}

module.exports = run;
