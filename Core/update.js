const S3 = require("../aws/s3");
const CORE = require("./core");
const uuid = require("uuid");
const Builder = require("../Utilities/builder");
const Teardown = require('../Utilities/Teardown/teardown')
const Dynamo = require('../aws/dynamo');
const Gateway = require("../aws/gateway");
let db = new Dynamo();

const getConfig = () => require(process.env.PWD + "/config.json");

// TODO get from config
// const gatewayStage = "test";
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
  // table: Project name(PK) || version(SK)
  const { projectId } = config.projectInfo;
  const {region} = config.AWSInfo
  let db = new Dynamo(region);

  const deployments = await db.getDeployments(projectId);

  let deployment = deployments[0];
  const {edgeLambdas, api, bucket, cloudfrontId} = deployment
  let dataForUpdate = {
    cloudfrontId: cloudfrontId,
    s3: bucket, // bucket name
    apiId: api.apiId,
    proxyARN: edgeLambdas[0]
  }
  return dataForUpdate;
}

const removeArtifacts = async () => {
  let arch = new Builder("rm -rf archives");
  await arch.build();
  let build = new Builder(`rm -rf ${config.buildInfo.buildFolder}`);
  await build.build();
}

const deployUpdate = async () => {
  attachConfig();
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
    // console.log(error.message);
    throw new Error(error.message);
  }

  let torn = false
  deployment.deployed = false;
  const updateData = await getUpdateData(config);



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
    await CORE.deployStaticAssets(bucket);

    const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);
    const cloudfrontRes = await CORE.invalidateDistribution(updateData.cloudfrontId);

    await CORE.updateProxy(updateData.cloudfrontId, proxyArn);

    deployment.cloudfrontId = updateData.cloudfrontId;

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
    await db.addDeploymentToTable(deployment.tableName, deployment)
  }

  console.log("the deployment: ", deployment);

  // await CORE.updateCors(domainName)// will add the permissions to api gateway from dist
};
// const ans = async () => {
//   const dist = await getMostRecentDist(tableName)
//   console.log(dist)

// }
// run();

module.exports = deployUpdate;