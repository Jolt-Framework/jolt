const {
  AuthorizationType,
  IntegrationType,
} = require("@aws-sdk/client-apigatewayv2");

const Constants = require("../lib/constants/gateway");

const gateway = require("@aws-sdk/client-apigatewayv2");
/** For creating and working with API Gateway
 * @class
 */
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
  /**
   * @constructor
   * @param {string} apiName 
   * @param {string} region if none is specified during `jolt init`, the default region will be us-east-1
   * @param {string} stageName is the version of the current deployment
   */
  constructor(apiName, AWS_REGION, stageName) {
    this.client = new gateway.ApiGatewayV2({ region: AWS_REGION });
    this.apiName = apiName;
    this.region = AWS_REGION;
    Gateway.all.push(this);
    if (stageName) this.stageName = stageName;
  }

  async getVersions() {
    let versions = await this.client.getStages({
      ApiId: this.apiId,
    });

    return versions.Items;
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

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * @returns {Promise<gateway.DeleteApiCommandOutput>}
   */
  async deleteApi() {
    try {
      const data = await this.client.deleteApi({ ApiId: this.apiId });
      return Promise.resolve(data);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteStage() {
    await this.client.deleteStage({
      ApiId: this.apiId,
      StageName: this.stageName,
    });
  }
  /**
   * @returns {Promise<Gateway>}
   * this command will return the gateway if it is already created
   */
  async create() {
    if (this.#created) return Promise.resolve(this);
    let api;
    try {
      api = await this.client.createApi({
        Name: this.apiName,
        ProtocolType: gateway.ProtocolType.HTTP,
        CorsConfiguration: {
          AllowOrigins: Constants.ALLOWED_ORIGINS,
          AllowHeaders: Constants.ALLOWED_HEADERS,
          AllowMethods: Constants.ALLOWED_METHODS
        },
      });
      this.url = api.ApiEndpoint;
      this.apiId = api.ApiId;
      this.#created = true;
      return Promise.resolve(this);
    } catch (error) {
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
    return routes;
  }

  async #getIntegrations() {
    let integrations = await this.client.getIntegrations({
      ApiId: this.apiId,
    });

    return integrations.Items;
  }

  async clearRoutes() {
    let routes = await this.#getRoutes();
    for (const route of this.#routes) {
      let a = await this.client.deleteRoute({
        ApiId: this.apiId,
        RouteId: route.RouteId,
      });
    }
    this.#routes = [];
  }

  // WARNING: Deprecated
  async update(apiId, lambdas) {
    //arns of the previous deployment.
    this.apiId = apiId;
    // get the routes for the api.
    // for each "Target" we have an integration path, we can either update the integration or create a new one
    await this.#getRoutes();
    let integrations = await this.#getIntegrations();

    for (const integration of integrations) {
      const lambdaForIntegration = lambdas.find((arn) => {
        arn = arn.replace(Constants.VERSION_REMOVAL_REGEX, Constants.EMPTY_STRING);
        return integration.IntegrationUri.match(arn);
      });

      await this.client.updateIntegration({
        ApiId: this.apiId,
        IntegrationId: integration.IntegrationId,
        IntegrationUri: lambdaForIntegration,
      });
    }

    await this.deploy(
      this.stageName,
      Constants.INTEGRATION_UPDATE_MESSAGE + JSON.stringify(lambdas)
    );
  }

  /**
   * @param {string} apiId id of the api
   * @type options the updated configuration options
   * @returns */
  static async update(apiId, options) {
    let api = this.find(apiId);
    if (!api) return;
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
      throw new Error(error.message);
    }
  }

  /**
   * @param {string} StageName the name of the new stage
   * @mutation adds a new stage to the gateway
   * @returns {Promise<gateway.CreateStageCommandOutput>} returns the stage object.
   * */
  async createStage(stageName) {
    try {
      const stage = await this.client.createStage({
        ApiId: this.apiId,
        StageName: stageName,
      });
      this.#stages.push(stage);
      this.stageName = stageName;
      return stage;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  #integrations = {};

  async #createIntegration(functionName, arn) {
    if (this.#integrations[functionName])
      return this.#integrations[functionName];

    let integration;
    try {
      integration = await this.client.createIntegration({
        ApiId: this.apiId,
        IntegrationMethod: Constants.INTEGRATION_METHOD,
        IntegrationType: IntegrationType.AWS_PROXY,
        IntegrationUri: arn,
        PayloadFormatVersion: Constants.INTEGRATION_VERSION,
      });

      this.#integrations[functionName] = integration;
      return integration;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * @param {string} method "DELETE, GET, HEAD, OPTIONS, POST, PUT, PATCH"
   * @param {string} path the path for the endpoint
   * @param {string} functionName the name of the lambda function
   * @returns {Promise<gateway.CreateRouteCommandOutput>}
   */
  async addRoute(method, path, functionName, arn) {
    let route;
    let integration = await this.#createIntegration(functionName, arn);

    try {
      if (method === Constants.OPTIONS_METHOD) {
        route = await this.client.createRoute({
          ApiId: this.apiId,
          AuthorizationType: AuthorizationType.NONE,
          RouteKey: method + Constants.ROUTE_KEY_SEPARATOR + path,
        });
      } else {
        route = await this.client.createRoute({
          ApiId: this.apiId,
          AuthorizationType: AuthorizationType.NONE,
          RouteKey: method + Constants.ROUTE_KEY_SEPARATOR + path,
          Target: `integrations/${integration.IntegrationId}`,
        });
      }
    } catch (error) {
      throw new Error(error.message);
    }
    this.#routes.push(route);
    return route;
  }

  async addOptions() {}

  async deleteRoute(RouteKey, ApiId) {
    let data;
    try {
      const RouteId = this.#routes.find((r) => r.RouteKey === RouteKey)?.id;
      data = await this.client.deleteRoute({ ApiId, RouteId });
      this.#routes = this.#routes.filter((route) => route.RouteKey !== RouteId);
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static find(apiId) {
    return this.all.find((gw) => gw.apiId === apiId);
  }
}

module.exports = Gateway;
