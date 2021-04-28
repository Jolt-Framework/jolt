const {
  LambdaClient,
  CreateFunctionCommand,
  AddPermissionCommand,
  DeleteFunctionCommand,
  PublishVersionCommand,
  UpdateFunctionCodeCommand
} = require("@aws-sdk/client-lambda");
const path = require('path');

// For testing - Replace with IAM class import
// const IAM = { LambdaRole: "arn:aws:iam::472111561985:role/s3BucketAccessForCreatingLambdas"};
// const IAM = { LambdaRole: "arn:aws:iam::444510759772:role/autoLambdaExecutionRole" }
const REGION = "us-east-1";

/** For creating and working with Lambda Functions
  * @class
  */
class Lambda /*extends something?*/ {
  static Client = new LambdaClient({ region: REGION });

  static all = [];

  /**
   * @constructor
   * @param {string} S3Bucket - The name of the bucket
   * @param {string} S3Key - The path and filename in the bucket
   */
  constructor(S3Bucket, S3Key) {
    this.init(S3Bucket, S3Key);
    Lambda.all.push(this);
  }

  /**
   * Initialize the Lambda from an S3 Bucket and assign relevant properties
   * @param {string} S3Bucket - The name of the bucket
   * @param {string} S3Key - The path and filename in the bucket
   */
  async init(S3Bucket, S3Key) {
    this.S3Bucket = S3Bucket;
    this.S3Key = S3Key;
    // this.arn = await this.create();
  }

  // I'm assuming the entrypoint file is the LambdaName.js and the file is zipped as LamdaName.zip
  // So the entry point is LambdaName.handler
  /**
   * Create the Lambda from an S3 Bucket
   * @param {String} role the ARN of the lambda Role
   * @return {Promise<String>} The arn of the newly created Lambda
   */
  async create(role) {
    const FunctionName = path.basename(this.S3Key, ".zip");

    const lambdaParams = {
      Code: {
        S3Bucket: this.S3Bucket,
        S3Key: this.S3Key,
      },
      FunctionName,
      Handler: `${FunctionName}.handler`,
      Role: role,
      Runtime: "nodejs12.x",
    };
    let result;
    try {
      result = await Lambda.Client.send(new CreateFunctionCommand(lambdaParams));
      this.arn = result.FunctionArn;
      await this.setPermissions();
      return Promise.resolve(result.FunctionArn);
    } catch (err) {
      try {
        console.log(err.message);
        console.log("attempting  update tothe existing function...")
        let params = {
          Publish: true,
          S3Bucket: this.S3Bucket,
          S3Key: this.S3Key,
          FunctionName
        }
        result = await Lambda.Client.send(new UpdateFunctionCodeCommand(params))
        console.log("updated function: \n", result.FunctionName)
        this.versioned = true;
        console.log("this is the version", result.Version)
        this.version = result.Version
        this.arn = result.FunctionArn
        return Promise.resolve(result.FunctionArn)
      } catch (error) {
        console.log("unable to update the function's code, \n", error.message)
      }
    }
  }

  /**
   * publishes a version for use with LambdaEdge
   * @returns {Promise<Boolean>}
   */
  async deployVersion() {
    try {
      const func = await Lambda.Client.send(new PublishVersionCommand({ FunctionName: this.arn }));
      this.version = func.Version;
      return Promise.resolve(true);
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  /**
   * Give the API Gateway permission to invoke the Lambda
   */
  async setPermissions() {
    try {
      const params = {
        FunctionName: this.arn,
        StatementId: "thisisalambda",
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        // SourceArn: this.gatewayArn,
      }
      await Lambda.Client.send(new AddPermissionCommand(params));
      console.log("Successfully added permissions to lambda.");
    } catch (err) {
      console.log("Error adding permissions to lambda.", err);
    };
  };

  // Maybe look into deleting "event source mappings" to remove triggers after deleting a Lambda? Or something...
  /**
   * Delete an individual Lambda (Should be private... Shhhh... Don't tell anyone!)
   * @param {string} arn - The name/resource number of the Lambda
  */
  static async #delete(arn) {
    try {
      const params = {
        FunctionName: arn
      }
      await Lambda.Client.send(new DeleteFunctionCommand(params));
      console.log("Successfully deleted the lambda:", arn);
    } catch (error) {
      console.log("Error deleting the lambda: ", error.message);
      if(!error.message.includes("edge-proxy"))throw new Error(error.message)
    }
  }

  /**
   * Teardown all Lambdas when project is deleted
   * @param {array}
  */
  static async teardown(lambdaList) {
    for (let index = 0; index < lambdaList.length; index++) {
      const arn = lambdaList[index];
      console.log("deleting, ", arn)
      await Lambda.#delete(arn);
    }
    // lambdaList.forEach((lambda) => { // this refers to an arn
    //   console.log("deleting ",lambda)
    //   Lambda.#delete(lambda)
    // })
  }
}

module.exports = Lambda;
