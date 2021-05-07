const {
  LambdaClient,
  CreateFunctionCommand,
  AddPermissionCommand,
  DeleteFunctionCommand,
  PublishVersionCommand,
  UpdateFunctionCodeCommand,
  ListVersionsByFunctionCommand,
  UpdateFunctionConfigurationCommand
} = require("@aws-sdk/client-lambda");
const { version } = require("esbuild");
const path = require('path');
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
  async create(role, secrets) {
    const FunctionName = path.basename(this.S3Key, ".zip");

    const lambdaParams = {
      Code: {
        S3Bucket: this.S3Bucket,
        S3Key: this.S3Key,
      },
      Publish: true,
      FunctionName,
      Handler: `${FunctionName}.handler`,
      Role: role,
      Runtime: "nodejs12.x",
    };

    if (secrets) {
      lambdaParams.Environment = {
        Variables: {
          ...secrets
        }
      };
    }

    let result;
    try {
      result = await Lambda.Client.send(new CreateFunctionCommand(lambdaParams));
      this.arn = result.FunctionArn;
      await this.setPermissions();
      return Promise.resolve(result.FunctionArn);
    } catch (err) {
      try {
        console.log(err.message + ". Updating function...");
        let params = {
          Publish: true,
          S3Bucket: this.S3Bucket,
          S3Key: this.S3Key,
          FunctionName
        }

        try {
            await Lambda.Client.send(new UpdateFunctionConfigurationCommand({
              FunctionName,
              Role: role,
              Environment: {
                Variables: {
                  ...secrets,
                }
              }
            }))
        } catch (error) {
          throw new Error(error.message);
        }

        result = await Lambda.Client.send(new UpdateFunctionCodeCommand(params))
        this.versioned = true;
        this.version = result.Version
        this.arn = result.FunctionArn
        await this.setPermissions();
        console.log(this.arn);
        return Promise.resolve(result.FunctionArn);

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
      }
      await Lambda.Client.send(new AddPermissionCommand(params));
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
    } catch (error) {
      console.log("Error deleting the lambda: ", error.message);
      if(!error.message.includes("edge-proxy"))throw new Error(error.message)
    }
  }

  static async #getVersions(arn) {
    arn = arn.replace(/:\d+$/, "");
    let details = await Lambda.Client.send(new ListVersionsByFunctionCommand({FunctionName: arn}));

    return details.Versions;
  }

  /**
   * Teardown all Lambdas when project is deleted
   * @param {array}
  */
  static async teardown(lambdaList) {
    console.log("Deleting lambdas...");
    for (let index = 0; index < lambdaList.length; index++) {
      let arn = lambdaList[index];
      let versionlessARN = arn.replace(/:\d+$/, "");

      if (await Lambda.#getVersions(versionlessARN).length > 1) arn = versionlessARN;
      await Lambda.#delete(arn);
    }

    console.log("Successfully deleted all lambdas");
  }
}

module.exports = Lambda;
