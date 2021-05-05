const IAM = require("../aws/iam");
const APIGateway = require("../aws/gateway");
const S3 = require("../aws/s3");
const CloudFront = require("../aws/cloudfront");
const Dynamo = require("../aws/dynamo");
const Lambda = require("../aws/lambda");
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
