const { CloudFront } = require("@aws-sdk/client-cloudfront");
const AWS = require("@aws-sdk/client-cloudfront");

const Constants = require("../lib/constants/cloudFront");

const { DEFAULT_REGION } = require("../lib/constants/global");

/** For creating and working with CloudFront
 * @class
 */
class CloudFrontWrapper {
  static distributions = {};

  constructor(region = DEFAULT_REGION) {
    this.client = new AWS.CloudFront({ region });
  }

  async createDistribution(bucketDomainName, bucketName, proxyARN, reference) {
    this.enabled = true;
    const params = {
      DistributionConfig: this.createDistributionConfig(
        bucketDomainName,
        bucketName,
        proxyARN,
        reference
      ),
    };

    try {
      const { Distribution } = await this.client.createDistribution(params);
      CloudFrontWrapper.distributions[reference] = Distribution;
      return Distribution;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateEdgeLambda(cloudfrontId, proxyARN) {
    const { ETag, DistributionConfig } = await this.getDistribution(
      cloudfrontId
    );

    DistributionConfig.CacheBehaviors.Items[0].LambdaFunctionAssociations.Items[0].LambdaFunctionARN =
      proxyARN;

    const dist = await this.client.updateDistribution({
      Id: cloudfrontId,
      IfMatch: ETag,
      DistributionConfig,
    });

    let res = await AWS.waitForDistributionDeployed(
      {
        client: this.client,
        maxWaitTime: 300,
      },
      {
        Id: cloudfrontId,
      }
    );

    return Promise.resolve(res);
  }
  async getDistribution(id) {
    try {
      const { ETag, Distribution } = await this.client.getDistribution({
        Id: id,
      });
      return { ETag, DistributionConfig: Distribution.DistributionConfig };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteDistribution(id, callback) {
    try {
      const { ETag } = await this.getDistribution(id);
      try {
        const confirmation = await this.client.deleteDistribution({
          Id: id,
          IfMatch: ETag,
        });
        if (callback) await callback();
      } catch (err) {
        throw new Error(Constants.DISTRIBUTION_DELETION_FAILED + err.message);
      }
    } catch (error) {
      return callback();
    }
  }

  async invalidateDistribution(id) {
    const res = await this.client.createInvalidation({
      DistributionId: id,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Items: [`/${CloudFrontWrapper.config.buildInfo.buildFolder}/*`],
          Quantity: 1,
        },
      },
    });

    let newRes = await AWS.waitForInvalidationCompleted(
      {
        maxWaitTime: 300,
        client: this.client,
      },
      {
        DistributionId: id,
        Id: res.Invalidation.Id,
      }
    );

    return newRes;
  }

  async disableDistribution(id) {
    this.enabled = false;
    const distribution = await this.getDistribution(id);
    const { ETag, DistributionConfig } = distribution;
    if (!DistributionConfig.Enabled) return distribution;

    DistributionConfig.CacheBehaviors.LambdaFunctionAssociations = {
      Quantity: Constants.ZERO_STRING,
    };
    const params = {
      Id: id,
      IfMatch: ETag,
      DistributionConfig: { ...DistributionConfig, Enabled: this.enabled },
    };

    try {
      const { Distribution } = await this.client.updateDistribution(params);
      const distribution = await AWS.waitForDistributionDeployed(
        {
          client: this.client,
          maxWaitTime: 360,
        },
        { Id: Distribution.Id }
      );
      return distribution;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  createDistributionConfig(bucketDomainName, bucketName, proxyARN, reference) {
    const buildFolder = CloudFrontWrapper.config.buildInfo.buildFolder;

    return {
      DefaultRootObject: Constants.DEFAULT_ROOT_OBJECT,
      Enabled: this.enabled,
      Origins: {
        Quantity: Constants.ONE_STRING,
        Items: [
          {
            DomainName: bucketDomainName,
            OriginPath: Constants.FORWARD_SLASH + buildFolder,
            Id: Constants.BUCKET_PREFIX + bucketName,
            S3OriginConfig: {
              OriginAccessIdentity: Constants.EMPTY_STRING,
            },
          },
        ],
      },
      CallerReference: reference,
      PriceClass: Constants.PRICE_CLASS,
      Comment: Constants.COMMENT,
      DefaultCacheBehavior: {
        ForwardedValues: {
          Cookies: {
            Forward: Constants.COOKIE_FORWARD,
          },
          QueryString: true,
        },
        MinTTL: Constants.TIME_TO_LIVE,
        TargetOriginId: Constants.BUCKET_PREFIX + bucketName,
        ViewerProtocolPolicy: Constants.VIEWER_PROTOCOL_POLICY,
        AllowedMethods: {
          Items: Constants.HTTP_METHODS,
          Quantity: Constants.HTTP_METHODS.length,
        },
      },
      CacheBehaviors: {
        Quantity: Constants.ONE_STRING,
        Items: [
          {
            ForwardedValues: {
              Cookies: {
                Forward: Constants.COOKIE_FORWARD,
              },
              QueryString: true,
            },
            AllowedMethods: {
              Items: Constants.HTTP_METHODS,
              Quantity: Constants.HTTP_METHODS.length,
            },
            MinTTL: Constants.ZERO_STRING,
            MaxTTL: Constants.ZERO_STRING,
            PathPattern: Constants.FUNCTIONS_PATH_PATTERN,
            TargetOriginId: Constants.BUCKET_PREFIX + bucketName,
            ViewerProtocolPolicy: Constants.VIEWER_PROTOCOL_POLICY,
            LambdaFunctionAssociations: {
              Quantity: Constants.ONE_STRING,
              Items: [
                {
                  EventType: Constants.LAMBDA_EVENT_TYPE,
                  LambdaFunctionARN: proxyARN,
                  IncludeBody: true,
                },
              ],
            },
          },
        ],
      },
    };
  }
}

module.exports = CloudFrontWrapper;
