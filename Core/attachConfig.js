const IAM = require("../IAM/iam");
const APIGateway = require("../APIGateway/gateway");
const S3 = require("../S3/s3");
const CloudFront = require("../CloudFront/cloudfront");
const Dynamo = require("../Dynamo/dynamo");
const Lambda = require("../Lambda/lambda");
const Core = require("../Core/core");

const attachConfig = () => {
  try {
    const config = require(process.env.PWD + "/config.json");
  } catch (err) {
    throw Error("config.json not found. Try running this command from the root of your project or running 'core init' to get started")
  }

  [IAM, APIGateway, S3, CloudFront, Dynamo, Lambda, Core].forEach((wrapper) => {
    wrapper.config = config;
  })
}
