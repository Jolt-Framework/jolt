const AWS = require("@aws-sdk/client-cloudfront");
// const config = require('../core/config.json');

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
      )
    };
    try {
      const { Distribution } = await this.client.createDistribution(params);

      CloudFrontWrapper.distributions[reference] = Distribution;
      return Distribution;
    } catch (error) {
      console.log("Unable to create Cloudfront distribution.");
      throw new Error(error.message);
    }
  }

  async updateEdgeLambda(cloudfrontId, proxyARN) {
    const { ETag, DistributionConfig } = await this.getDistribution(cloudfrontId);

    DistributionConfig.CacheBehaviors.Items[0].LambdaFunctionAssociations.Items[0].LambdaFunctionARN = proxyARN;

    const dist = await this.client.updateDistribution(
      {
        Id: cloudfrontId,
        IfMatch: ETag,
        DistributionConfig,
      }
    );

    let res = await AWS.waitForDistributionDeployed({
      client: this.client,
      maxWaitTime: 300
    }, {
      Id: cloudfrontId,
    })

    return Promise.resolve(res)
  }
  async getDistribution(id) {
    try {
      const { ETag, Distribution } = await this.client.getDistribution({ Id: id })
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
        const confirmation = await this.client.deleteDistribution({ Id: id, IfMatch: ETag });
        console.log("Distribution successfully deleted:\n", confirmation);
        if (callback) await callback()
      } catch(err) {
        console.log("unable to delete distribution", err.message)
      }
    } catch (error) {
        console.log("Distribution not found.");
        return callback();
    }
  }

  async invalidateDistribution(id ) {
    const res = await this.client.invalidateDistribution({ DistributionId: id })
    let newRes = await AWS.waitForInvalidationCompleted({
      maxWaitTime: 300,
      client: this.client
    },
    {
      DistributionId: id,
      Id: res.Invalidation.Id
    });

    return newRes;
  }

  async disableDistribution(id) {
    this.enabled = false;
    const distribution = await this.getDistribution(id);
    const { ETag, DistributionConfig } = distribution;
    if (!DistributionConfig.Enabled) return distribution;

    DistributionConfig.CacheBehaviors.LambdaFunctionAssociations = {
      Quantity: "0"
    };
    const params = {
      Id: id,
      IfMatch: ETag,
      DistributionConfig: { ...DistributionConfig, Enabled: this.enabled },
    }

    try {
      const { Distribution } = await this.client.updateDistribution(params);
      console.log("Distribution successfully updated:\n", Distribution);
      const distribution = await AWS.waitForDistributionDeployed({
        client: this.client,
        maxWaitTime: 360
      }, { Id: Distribution.Id });
      return distribution;
    } catch (error) {
      console.log("unable to update distribution");
      throw new Error(error.message);
    }
  }

  // async deleteCloudfrontPolicy(distName, policyArn) {

  // }

  createDistributionConfig(bucketDomainName, bucketName, proxyARN, reference) {
    const buildFolder = "build";

    return {
      DefaultRootObject: "index.html",
      Enabled: this.enabled,
      Origins: {
        Quantity: "1",
        Items: [{
          DomainName: bucketDomainName,
          OriginPath: "/" + buildFolder,
          Id: "S3-" + bucketName,
          S3OriginConfig: {
            OriginAccessIdentity: "",
          },
        }],
      },
      CallerReference: reference,
      PriceClass: "PriceClass_100",
      Comment: "test deployment",
      DefaultCacheBehavior: {
        ForwardedValues: {
          Cookies: {
            Forward: "all",// types.ItemSelectionAll
          },
          QueryString: true,
        },
        MinTTL: "300",
        TargetOriginId: "S3-" + bucketName,
        ViewerProtocolPolicy: "allow-all", // types.ViewerPolicyAllowAll
        AllowedMethods: {
          Items: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
          Quantity: "7",
        },
      },
      CacheBehaviors: {
        Quantity: "1",
        Items: [{
          ForwardedValues: {
            Cookies: {
              Forward: "all",// types.ItemSelectionAll - Allowed values: all | none | whitelist
            },
            QueryString: true,
          },
          AllowedMethods: {
            Items: ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "POST", "DELETE"],
            Quantity: "7",
          },
          MinTTL: "0",
          MaxTTL: "0",
          PathPattern: ".functions/*",
          TargetOriginId: "S3-" + bucketName,
          ViewerProtocolPolicy: "allow-all",// types.ItemSelectionAll - Allowed values: all | none | whitelist
          LambdaFunctionAssociations: {
            Quantity: "1",
            Items: [
              {
                EventType: "viewer-request",//types.EventTypeViewerRequest
                LambdaFunctionARN: proxyARN,
                IncludeBody: true,
              },
            ],
          },
        }],
      },
    }
  }
}

module.exports = CloudFrontWrapper;