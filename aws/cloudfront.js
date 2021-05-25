const { CloudFront } = require("@aws-sdk/client-cloudfront");
const AWS = require("@aws-sdk/client-cloudfront");

const cloudFrontConstants = require("../lib/constants/cloudFront");

class CloudFrontWrapper {
  static distributions = {};

  constructor(region = "us-east-1") {
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
    // Tags: [ // need to add tags
    //     {
    //       Key: "Jolt-Project",
    //       Value: projectName,
    //     }
    //   ],
    try {
      const { Distribution } = await this.client.createDistribution(params);
      CloudFrontWrapper.distributions[reference] = Distribution;
      return Distribution;
    } catch (error) {
      console.log(cloudFrontConstants.DISTRIBUTION_CREATION_FAILED);
      throw new Error(error.message);
    }
  }

  async updateEdgeLambda(cloudfrontId, proxyARN) {
    const { ETag, DistributionConfig } = await this.getDistribution(
      cloudfrontId
    );

    DistributionConfig.CacheBehaviors.Items[0].LambdaFunctionAssociations.Items[0].LambdaFunctionARN = proxyARN;

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
      console.log(`Distribution: ${id} does not exist`);
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
        console.log(cloudFrontConstants.DISTRIBUTION_DELETED, confirmation);
        if (callback) await callback();
      } catch (err) {
        console.log(cloudFrontConstants.DISTRIBUTION_DELETION_FAILED, err.message);
      }
    } catch (error) {
      console.log(cloudFrontConstants.DISTRIBUTION_NONEXISTENT);
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
      Quantity: "0",
    };
    const params = {
      Id: id,
      IfMatch: ETag,
      DistributionConfig: { ...DistributionConfig, Enabled: this.enabled },
    };

    try {
      const { Distribution } = await this.client.updateDistribution(params);
      console.log(cloudFrontConstants.DISTRIBUTION_UPDATED, Distribution);
      const distribution = await AWS.waitForDistributionDeployed(
        {
          client: this.client,
          maxWaitTime: 360,
        },
        { Id: Distribution.Id }
      );
      return distribution;
    } catch (error) {
      console.log(cloudFrontConstants.DISTRIBUTION_UPDATE_FAILED);
      throw new Error(error.message);
    }
  }

  createDistributionConfig(bucketDomainName, bucketName, proxyARN, reference) {
    const buildFolder = CloudFrontWrapper.config.buildInfo.buildFolder;

    return {
      DefaultRootObject: "index.html",
      Enabled: this.enabled,
      Origins: {
        Quantity: "1",
        Items: [
          {
            DomainName: bucketDomainName,
            OriginPath: "/" + buildFolder,
            Id: "S3-" + bucketName,
            S3OriginConfig: {
              OriginAccessIdentity: "",
            },
          },
        ],
      },
      CallerReference: reference,
      PriceClass: "PriceClass_100",
      Comment: "test deployment",
      DefaultCacheBehavior: {
        ForwardedValues: {
          Cookies: {
            Forward: "all",
          },
          QueryString: true,
        },
        MinTTL: "300",
        TargetOriginId: "S3-" + bucketName,
        ViewerProtocolPolicy: "allow-all",
        AllowedMethods: {
          Items: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
          Quantity: "7",
        },
      },
      CacheBehaviors: {
        Quantity: "1",
        Items: [
          {
            ForwardedValues: {
              Cookies: {
                Forward: "all",
              },
              QueryString: true,
            },
            AllowedMethods: {
              Items: [
                "GET",
                "HEAD",
                "OPTIONS",
                "PUT",
                "PATCH",
                "POST",
                "DELETE",
              ],
              Quantity: "7",
            },
            MinTTL: "0",
            MaxTTL: "0",
            PathPattern: ".functions/*",
            TargetOriginId: "S3-" + bucketName,
            ViewerProtocolPolicy: "allow-all",
            LambdaFunctionAssociations: {
              Quantity: "1",
              Items: [
                {
                  EventType: "viewer-request",
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
