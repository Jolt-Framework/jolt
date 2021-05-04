const S3 = require("../S3/s3");
const CORE = require("./core");
const Builder = require("../Utilities/builder");
const uuid = require("uuid");
const Teardown = require('../Teardown/teardown')
const Dynamo = require('../Dynamo/dynamo');
const Gateway = require("../APIGateway/gateway");
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

const deployUpdate = async () => {

  const config = getConfig();
  const deployment = await createDeploymentTemplate(config);
  CORE.deployment = deployment;
  CORE.config = config;
  // try {
  //   console.log("Building started");

  //   const builder = new Builder(config.buildInfo.buildCommand);
  //   await builder.build();
  //   // REMOVE THIS LATER
  //   const builder2 = new Builder("cd Demo && mv -r build ../");
  //   await builder2.build();
  //   // END REMOVE THIS LATER
  //   console.log("Build completed!");
  // } catch (error) {
  //   console.log("Failed to complete build process");
  //   // console.log(error.message);
  //   throw new Error(error.message);
  // }

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
    console.log("trying to update ")

    let api = new Gateway(config.AWSInfo.apiName, region, deployment.version);
    api.apiId = updateData.apiId;
    console.log(api.apiId);
    await api.clearRoutes();
    await new Promise(resolve => setTimeout(resolve, 10000));
    const gatewayUrl = await CORE.updateLambdasAndGateway(bucket, updateData);

    await CORE.deployStaticAssets(bucket);

    const { proxyArn } = await CORE.deployEdgeLambda(bucket, gatewayUrl);
    // const cloudfrontRes = await CORE.invalidateDistribution(cloudfrontId);

    CORE.updateProxy(updateData.cloudfrontId, proxyArn);

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

// ans()