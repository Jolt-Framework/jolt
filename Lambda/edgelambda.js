const Lambda = require("./lambda");

class EdgeLambda extends Lambda {
  constructor(S3Bucket, S3Key, gatewayUrl) {
    super(S3Bucket, S3Key);
    this.gatewayUrl = gatewayUrl;
  }

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
}
