const S3 = require("../aws/s3");
const CORE = require("./core");
const uuid = require("uuid");
const Builder = require("../Utilities/builder");
const Teardown = require('../Utilities/Teardown/teardown')
const Dynamo = require('../aws/dynamo');
const Gateway = require("../aws/gateway");
const attachConfig = require("../Utilities/attachConfig");

let db = new Dynamo();

const getConfig = () => require(process.env.PWD + "/config.json");

const createDeploymentTemplate = async (config) => {
  if (!config) config = getConfig();
  const { projectId: tableName, projectName } = config.projectInfo;

  let version = await db.getNextVersionNumber(tableName);

  return ({
    tableName,
    projectName,
    files: [],
    lambdas: [],
    edgeLambdas: [],
    version,
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
  const config = getConfig();
  let arch = new Builder("rm -rf archives");
  await arch.build();
  let build = new Builder(`rm -rf ${config.buildInfo.buildFolder}`);
  await build.build();
}

const deployUpdate = async () => {
  const config = getConfig();
  const deployment = await createDeploymentTemplate(config);
  CORE.deployment = deployment;
  CORE.config = config;
  try {
    console.log("Building started");
    await removeArtifacts();
    const builder = new Builder(config.buildInfo.buildCommand);
    await builder.build();
    console.log("Build completed!");
  } catch (error) {
    console.log("Failed to complete build process");
    throw new Error(error.message);
  }

  let torn = false
  deployment.deployed = false;
  const updateData = await getUpdateData(config);

  console.log(CORE.deployment.version)

  try {
    const bucketName = config.AWSInfo.bucketName;
    const region = config.AWSInfo.AWS_REGION;
    const ref = "CORE-Jamstack:" + uuid.v4();
    const bucket = new S3(bucketName);
    deployment.region = region;
    deployment.bucket = bucketName;
    console.log("trying to update...")

    let api = new Gateway(config.AWSInfo.apiName, region, deployment.version);
    api.apiId = updateData.apiId;
    await api.clearRoutes();
    await new Promise(resolve => setTimeout(resolve, 10000));
    const gatewayUrl = await CORE.updateLambdasAndGateway(bucket, updateData);
    deployment.api = api;
    await CORE.deployStaticAssets(bucket);
    delete deployment.api.client;
    const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);
    const cloudfrontRes = await CORE.invalidateDistribution(updateData.cloudfrontId);

    await CORE.updateProxy(updateData.cloudfrontId, proxyArn);

    deployment.cloudfrontId = updateData.cloudfrontId;

    deployment.deployed = true;

  } catch (error) {

    console.log("unable to complete distribution, process failed because: ", error);
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
    await db.addDeploymentToTable(deployment.tableName, deployment)
  }
};

module.exports = deployUpdate;