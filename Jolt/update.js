const S3 = require("../aws/s3");
const JOLT = require("./jolt");
const uuid = require("uuid");
const Builder = require("../Utilities/builder");
const Teardown = require('../Utilities/Teardown/teardown')
const Dynamo = require('../aws/dynamo');
const Gateway = require("../aws/gateway");
const loadConfig = require("../Utilities/loadConfig");
let db = new Dynamo();

// TODO get from config
// const gatewayStage = "test";
const createDeploymentTemplate = async (description) => {
  const config = loadConfig();

  const { projectId: tableName, projectName } = config.projectInfo;

  let version = await db.getNextVersionNumber(tableName);

  return ({
    tableName,
    projectName,
    files: [],
    lambdas: [],
    edgeLambdas: [],
    version,
    description,
  })
};

const getUpdateData = async (config) => {
  const { projectId } = config.projectInfo;
  const {region} = config.AWSInfo
  let db = new Dynamo(region);

  const deployments = await db.getDeployments(projectId);

  let deployment = deployments[0];
  const {edgeLambdas, api, bucket, cloudfrontId} = deployment
  let dataForUpdate = {
    cloudfrontId: cloudfrontId,
    s3: bucket,
    apiId: api.apiId,
    proxyARN: edgeLambdas[0]
  }
  return dataForUpdate;
}

const removeArtifacts = async () => {
  const config = loadConfig();

  let arch = new Builder("rm -rf archives");
  await arch.build();
  let build = new Builder(`rm -rf ${config.buildInfo.buildFolder}`);
  await build.build();
}


const deployUpdate = async (deploymentDescription) => {
  const config = loadConfig();
  const deployment = await createDeploymentTemplate(deploymentDescription);

  JOLT.deployment = deployment;
  JOLT.config = config;

  try {
    log("Building started");
    await removeArtifacts();
    const builder = new Builder(config.buildInfo.buildCommand);
    await builder.build();
    log("Build completed!");
  } catch (error) {
    log("Failed to complete build process");
    throw new Error(error.message);
  }

  let torn = false
  deployment.deployed = false;
  const updateData = await getUpdateData(config);

  try {
    const bucketName = config.AWSInfo.bucketName;
    const region = config.AWSInfo.AWS_REGION;
    // const ref = "Jolt-Jamstack:" + uuid.v4();
    const bucket = new S3(bucketName);
    deployment.region = region;
    deployment.bucket = bucketName;
    log("trying to update...")

    let api = new Gateway(config.AWSInfo.apiName, region, deployment.version);
    api.apiId = updateData.apiId;
    await api.clearRoutes();
    await new Promise(resolve => setTimeout(resolve, 10000));
    const gatewayUrl = await JOLT.updateLambdasAndGateway(bucket, updateData);
    deployment.api = api;
    await JOLT.deployStaticAssets(bucket);
    delete deployment.api.client;
    const { proxyArn } = await JOLT.deployEdgeLambda(bucket, gatewayUrl);
    const cloudfrontRes = await JOLT.invalidateDistribution(updateData.cloudfrontId);

    await JOLT.updateProxy(updateData.cloudfrontId, proxyArn);

    deployment.cloudfrontId = updateData.cloudfrontId;

    deployment.deployed = true;

  } catch (error) {

    log("unable to complete distribution, process failed because: ", error);
    log("initiating teardown... ");
    let teardown = new Teardown(deployment);
    await teardown.all();
    torn = true;
    log("teardown completed.");
  }

  if (!torn && !deployment.deployed) {
    let teardown = new Teardown(deployment)
    await teardown.all();
  } else if (deployment.deployed) {
    await db.createTable(deployment.tableName)
    await db.addDeploymentToTable(deployment.tableName, deployment)
  }

  await removeArtifacts();
};

module.exports = deployUpdate;

function log(...text) {
  log(...text);
}

