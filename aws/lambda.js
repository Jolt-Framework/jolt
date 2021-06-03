const {
  LambdaClient,
  CreateFunctionCommand,
  AddPermissionCommand,
  DeleteFunctionCommand,
  PublishVersionCommand,
  UpdateFunctionCodeCommand,
  ListVersionsByFunctionCommand,
  UpdateFunctionConfigurationCommand,
} = require("@aws-sdk/client-lambda");

const path = require("path");
const { DEFAULT_REGION } = require("../lib/constants/global");

const Constants = require("../lib/constants/LambdaConstants");

/** For creating and working with Lambda Functions
 * @class
 */
class Lambda /*extends something?*/ {
  static Client = new LambdaClient({ region: DEFAULT_REGION });

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
    const FunctionName = path.basename(
      this.S3Key,
      Constants.FUNCTION_ARCHIVE_EXTENSION
    );

    const lambdaParams = {
      Code: {
        S3Bucket: this.S3Bucket,
        S3Key: this.S3Key,
      },
      Publish: true,
      FunctionName,
      Handler: `${FunctionName}${Constants.FUNCTION_HANDLER_EXTENSION}`,
      Role: role,
      Runtime: Constants.FUNCTION_RUNTIME,
    };

    if (secrets) {
      lambdaParams.Environment = {
        Variables: {
          ...secrets,
        },
      };
    }

    let result;
    try {
      result = await Lambda.Client.send(
        new CreateFunctionCommand(lambdaParams)
      );
      this.arn = result.FunctionArn;
      await this.setPermissions();
      return Promise.resolve(result.FunctionArn);
    } catch (err) {
      try {
        let params = {
          Publish: true,
          S3Bucket: this.S3Bucket,
          S3Key: this.S3Key,
          FunctionName,
        };

        try {
          await Lambda.Client.send(
            new UpdateFunctionConfigurationCommand({
              FunctionName,
              Role: role,
              Environment: {
                Variables: {
                  ...secrets,
                },
              },
            })
          );
        } catch (error) {
          throw new Error(error.message);
        }

        result = await Lambda.Client.send(
          new UpdateFunctionCodeCommand(params)
        );
        this.versioned = true;
        this.version = result.Version;
        this.arn = result.FunctionArn;
        await this.setPermissions();
        return Promise.resolve(result.FunctionArn);
      } catch (error) {
        throw new Error(
          Constants.ERROR_UNABLE_TO_UPDATE_FUNCTION_CODE + error.message
        );
      }
    }
  }

  /**
   * publishes a version for use with LambdaEdge
   * @returns {Promise<Boolean>}
   */
  async deployVersion() {
    try {
      const func = await Lambda.Client.send(
        new PublishVersionCommand({ FunctionName: this.arn })
      );
      this.version = func.Version;
      return Promise.resolve(true);
    } catch (error) {
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
        StatementId: Constants.LAMBDA_PERMISSION_STATEMENT_ID,
        Action: Constants.LAMBDA_PERMISSION_ACTION,
        Principal: Constants.LAMBDA_PERMISSION_PRINCIPAL,
      };
      await Lambda.Client.send(new AddPermissionCommand(params));
    } catch (err) {}
  }

  // Maybe look into deleting "event source mappings" to remove triggers after deleting a Lambda? Or something...
  /**
   * Delete an individual Lambda (Should be private... Shhhh... Don't tell anyone!)
   * @param {string} arn - The name/resource number of the Lambda
   */
  static async #delete(arn) {
    try {
      const params = {
        FunctionName: arn,
      };
      await Lambda.Client.send(new DeleteFunctionCommand(params));
    } catch (error) {
      if (!error.message.includes(Constants.EDGE_PROXY_ERROR))
        throw new Error(error.message);
    }
  }

  static async #getVersions(arn) {
    arn = arn.replace(Constants.VERSION_REMOVAL_REGEX, Constants.EMPTY_STRING);
    let details = await Lambda.Client.send(
      new ListVersionsByFunctionCommand({ FunctionName: arn })
    );

    return details.Versions;
  }

  /**
   * Teardown all Lambdas when project is deleted
   * @param {array}
   */
  static async teardown(lambdaList) {
    for (let index = 0; index < lambdaList.length; index++) {
      let arn = lambdaList[index];
      let versionlessARN = arn.replace(
        Constants.VERSION_REMOVAL_REGEX,
        Constants.EMPTY_STRING
      );

      if ((await Lambda.#getVersions(versionlessARN).length) > 1)
        arn = versionlessARN;
      await Lambda.#delete(arn);
    }
  }
}

module.exports = Lambda;
