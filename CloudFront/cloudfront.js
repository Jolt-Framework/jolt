const AWS = require("@aws-sdk/client-cloudfront");
// const config = require('../core/config.json');

class CloudFrontWrapper {
  static distributions = {};

  constructor(region = "us-east-1") {
    this.client = new AWS.CloudFront({ region });
  }

  async removeEdgeLambdas() {
    
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


  async getDistribution(id) {
    try {
      const { ETag, Distribution } = await this.client.getDistribution({ Id: id })
      return { ETag, DistributionConfig: Distribution.DistributionConfig };
    } catch (error) {
      console.log(`Distribution: ${id} does not exist`);
      throw new Error(error.message);
    }
  }

  async deleteDistribution(id, callback, t) {
    t ||= 0
    try {
      const { ETag } = await this.getDistribution(id);
      if (!Etag) return callback();
      try {
        const confirmation = await this.client.deleteDistribution({ Id: id, IfMatch: ETag });
        await callback()
        console.log("Distribution successfully deleted:\n", confirmation);
      } catch (error) {
        if (t > 300000) {
          console.log("Too many retries, please wait and try this operation at another time");
          return;
        }
        const newTime = Number(t) + 120000;
        console.log(`Unable to delete at this time, will try again in ${newTime / 1000} seconds(times out after 2 retries)`);

        setTimeout(() => {
          this.deleteDistribution(id, callback, newTime);
        }, newTime);
      }
    } catch (error) {
      console.log("Distribution not found.");
    }
  }

  async disableDistribution(id) {
    this.enabled = false;
    const distribution = await this.getDistribution(id);
    const { ETag, DistributionConfig } = distribution;
    console.log("the dist config", DistributionConfig);
    if (!DistributionConfig.Enabled) return distribution;
    DistributionConfig.CacheBehaviors.LambdaFunctionAssociations = {
      Quantity: "0"
    };
    const params = {
      Id: id,
      IfMatch: ETag,
      DistributionConfig: { ...DistributionConfig, Enabled: this.enabled },
    }

    // console.log("the dist", DistributionConfig)
    try {
      const {Distribution} = await this.client.updateDistribution(params);
      console.log("Distribution successfully updated:\n", Distribution);

      const reference = DistributionConfig.CallerReference;
      CloudFrontWrapper.distributions[reference] = Distribution;
      return Distribution;
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