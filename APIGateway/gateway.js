const {
  AuthorizationType,
  IntegrationType,
} = require("@aws-sdk/client-apigatewayv2");
const gateway = require("@aws-sdk/client-apigatewayv2");
//TODO: Make sure API is created before invoking any function besides create.

class Gateway {
  /**
   * @type {gateway.CreateStageCommandOutput[]}
   * this is every stage created during runtime
   */
  #stages = [];
  /**
   * @type {gateway.CreateRouteCommandOutput[]}
   * these are all routes added to a gateway.
   */
  #routes = [];

  /**
   * @type {Boolean}
   * if this is true, we will not run the create process again
   */
  #created = false;

  /**
   * @type {Gateway}
   * every gateway created during runtime
   */
  static all = [];

  /**
   * @param {string} apiName
   */
  constructor(apiName, stageName) {
    this.client = new gateway.ApiGatewayV2({ region: "us-east-1" });
    this.apiName = apiName;
    Gateway.all.push(this);
    if(stageName) this.stageName = stageName;
  }

  /**
   * @param {string} StageName
   * @param {string} Description
   * @returns {Promise<gateway.CreateDeploymentCommandOutput>} Deployment Output
   */
  async deploy(StageName, Description) {
    try {
      const data = await this.client.createDeployment({
        ApiId: this.apiId,
        StageName,
        Description,
      });
      // this.#stages.push(StageName);
      return data;
    } catch (error) {
      console.log(
        `unable to deploy api gateway with an id of: ${this.apiId} to the stage: ${StageName}`
      );
      throw new Error(error.message);
    }
  }

  /**
   * @returns {Promise<gateway.DeleteApiCommandOutput>}
   */
  async deleteApi() {
    try {
      const data = await this.client.deleteApi({ ApiId: this.apiId });
      console.log("api deleted");
      return Promise.resolve(data);
    } catch (error) {
      console.log(
        "unable to delete or find gateway with an id of: ",
        this.apiId
      );
      throw new Error(error.message);
    }
  }

  /**
   * @returns {Promise<Gateway>}
   * this command will return the gateway if it is already created
   */
  async create() {
    if (this.#created) return Promise.resolve(this);
    const ALL = ["*"];
    let api;
    try {
      api = await this.client.createApi({
        Name: this.apiName,
        ProtocolType: gateway.ProtocolType.HTTP,
        CorsConfiguration: {
          AllowOrigins: ALL,
          AllowHeaders: ["content-type"],
          AllowMethods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "HEAD",
            "OPTIONS",
          ],
        },
      });
      this.url = api.ApiEndpoint; // TODO: might delete
      this.apiId = api.ApiId;
      // console.log(api);
      this.#created = true;
      return Promise.resolve(this);
    } catch (error) {
      console.log("unable to create api: " + this.apiName);
      throw new Error(error.message);
    }
  }


  async #getRoutes() {
    let routes;
    try {
      routes = await this.client.getRoutes({
        ApiId: this.apiId,
      });
    } catch (error) {
      throw new Error(error.message);
    }

    this.#routes = routes.Items;
  }

  async #getIntegrations() {
    let integrations =  await this.client.getIntegrations({
      ApiId: this.apiId,
    });

    return integrations.Items;
  }

  async update(apiId, lambdas) { //arns of the previous deployment.
    this.apiId = apiId;
    // get the routes for the api.
    // for each "Target" we have an integration path, we can either update the integration or create a new one
    await this.#getRoutes();
    let integrations = await this.#getIntegrations();

    for (const integration of integrations) {
      const lambdaForIntegration = lambdas.find((arn) => {
        arn = arn.replace(/:\d+$/, "");
        return integration.IntegrationUri.match(arn);
      });

      await this.client.updateIntegration({
        ApiId: this.apiId,
        IntegrationId: integration.IntegrationId,
        IntegrationUri: lambdaForIntegration,
      });
    }

    await this.deploy(this.stageName, `updated integrations for ${JSON.stringify(lambdas)}`);

  }

  /**
   * @param {string} apiId id of the api
   * @type options the updated configuration options
   * @returns */
  static async update(apiId, options) {
    let api = this.find(apiId);
    if (!api) return console.log("gateway not found");
    try {
      let data = await api.client.updateApi({
        ...api,
        ...options,
        ApiId: apiId,
      });
      let keys = Object.keys(api);
      keys.forEach((key) => {
        let res = data[key];
        if (res) {
          api[key] = res;
        }
      });
    } catch (error) {
      console.log("unable to update the api. Error:", error);
    }
  }

  /**
   * @param {string} StageName the name of the new stage
   * @mutation adds a new stage to the gateway
   * @returns {Promise<gateway.CreateStageCommandOutput>} returns the stage object.
   * */
  async createStage(StageName) {
    try {
      const stage = await this.client.createStage({
        ApiId: this.apiId,
        StageName,
      });
      // console.log("stage data: ", stage)
      this.#stages.push(stage);
      return stage;
    } catch (error) {
      console.log(`unable to create stage: ${StageName}`);
      throw new Error(error.message);
    }
  }

  #integrations = {};

  async #createIntegration(functionName) {
    if (this.#integrations[functionName])
      return this.#integrations[functionName];

    const lambdaRegion = "us-east-1";
    const functionARN = `arn:aws:lambda:${lambdaRegion}:444510759772:function:${functionName}`;
    let integration;
    try {
      integration = await this.client.createIntegration({
        ApiId: this.apiId,
        IntegrationMethod: "POST",
        IntegrationType: IntegrationType.AWS_PROXY,
        IntegrationUri: functionARN,
        PayloadFormatVersion: "2.0",
      });
      // console.log(" the integration: ", integration);
      // await this.#attachIntegration(route, functionName);
      // await this.#createIntegrationResponse(integration, path, route, functionName);
      this.#integrations[functionName] = integration;
      return integration;
    } catch (error) {
      console.log(
        "The integration for function: " +
          functionName +
          " could not be completed."
      );
      throw new Error(error.message);
    }
  }

  /**
   * @param {string} method "DELETE, GET, HEAD, OPTIONS, POST, PUT, PATCH"
   * @param {string} path the path for the endpoint
   * @param {string} functionName the name of the lambda function
   * @returns {Promis<gateway.CreateRouteCommandOutput>}
   */
  async addRoute(method, path, functionName) {
    let route;
    let integration = await this.#createIntegration(functionName);


    try {
        if (method === "OPTIONS") {
          route = await this.client.createRoute({
            ApiId: this.apiId,
            AuthorizationType: AuthorizationType.NONE,
            RouteKey: method + " /" + path
          });
        } else {
          route = await this.client.createRoute({
            ApiId: this.apiId,
            AuthorizationType: AuthorizationType.NONE,
            RouteKey: method + " /" + path,
            Target: `integrations/${integration.IntegrationId}`,
          });
          // await this.#createRouteResponse(method, path, route, functionName);
        }
      } catch (error) {
        console.log(
          `The route ${path}, for function ${functionName} could not be created.`
        );
        throw new Error(error.message);
      }
    this.#routes.push(route);
    return route;
  }

  async addOptions() {

  }

  async deleteRoute(RouteKey, ApiId) {
    let data;
    try {
      const RouteId = this.#routes.find((r) => r.RouteKey === RouteKey)?.id;
      data = await this.client.deleteRoute({ ApiId, RouteId });
      this.#routes = this.#routes.filter((route) => route.RouteKey !== RouteId);
      return data;
    } catch (error) {
      console.log(`unable to remove route: ${RouteId}`);
      throw new Error(error.message);
    }
  }

  static find(apiId) {
    return this.all.find((gw) => gw.apiId === apiId);
  }
}

module.exports = Gateway;

const test = async () => {
  const api = new Gateway("testName");
  await api.update("dcxzfen2fd", ["arn:aws:lambda:us-east-1:444510759772:function:createNote:1"])

};

test();