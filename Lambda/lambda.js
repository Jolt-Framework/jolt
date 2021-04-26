const {
  LambdaClient,
  CreateFunctionCommand,
  AddPermissionCommand,
  DeleteFunctionCommand,
  PublishVersionCommand
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

    try {
      const result = await Lambda.Client.send(new CreateFunctionCommand(lambdaParams));
      this.arn = result.FunctionArn;
      await this.setPermissions();
      return Promise.resolve(result.FunctionArn);
    } catch(err) {
      console.log("An error occurred:\n", err);
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
      console.log("Error deleting the lambda: ", error);
    }
  }

  /**
   * Teardown all Lambdas when project is deleted
   * @param {array}
  */
  static teardown(lambdaList) {
    lambdaList.forEach((lambda) => {
      Lambda.#delete(lambda)
    })
  }
}

module.exports = Lambda;
