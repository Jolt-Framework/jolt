const AWS = require("@aws-sdk/client-dynamodb")

class Dynamo {
  static all = []
  constructor(region = "us-east-1") {
    this.client = new AWS.DynamoDB({ region });
    Dynamo.all.push(this);
  }

  async createTable(tableName) {
    try {
      this.tableName = tableName;
      let res = await this.client.createTable({
        TableName: tableName,
        KeySchema: [
        {
          AttributeName: "projectName",
          KeyType: 'HASH',
        },
        {
          AttributeName: "version",
          KeyType: 'RANGE',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: "projectName",
            AttributeType: 'S',
          },
          {
            AttributeName: "version",
            AttributeType: 'S',
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
        Tags: [
          {
            Key: "Core-Project",
            Value: undefined,
          },
        ],
      })
      this.table = res

      await AWS.waitForTableExists({
        client: this.client,
        maxWaitTime: 30,
      },
      {
        TableName: tableName,
      })

      return res;
    } catch (error) {

      switch (error.name) {
        case "ResourceInUseException": {
          this.table = await this.client.describeTable({
            TableName: tableName,
          })

          return this.table;
        }
        default : {
          console.log("table already exists, ", error.message)
        }
      }
    }
  }

  format({ projectName, bucket, version, ...config }) {
    const {cloudfrontId} = config
    let items = {
      projectName: {
        S: projectName,
      },
      bucket: {
        S: bucket,
      },
      distributionId: {
        S: cloudfrontId,
      },
      version: {
        S: version,
      },
      config: {
        S: JSON.stringify(config),
      }
    }

    return items;
  }

  deformat(items) {
    let keys = Object.keys(items)
    let result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      let value = items[key]["S"]
      try {
        result[key] = JSON.parse(value)
      } catch (error) {
        result[key] = value
      }
    }
    return { ...result, ...result.config };
  }

  formatStrings(items) {
    let keys = Object.keys(items)
    let result = {}
    keys.forEach(key => {
      let item = items[key]
      if( typeof item !== "string") item = JSON.stringify(item)
      result[key] = {S: item}
    })
    return result;
  }

  async deleteTable(tableName) {
    try {
      let confirmation = await this.client.deleteTable({
        TableName: tableName
      })
    } catch (error) {
      throw new Error(error.message)
    }
  }

  async deleteItems(tableName, callback) {
    let results = [];
    try {
      let { Items } = await this.getItems(tableName)
      for (let index = 0; index < Items.length; index++) {
        const item = Items[index];

        if (callback) await callback(this.deformat(item));

        const { projectName, timeCreated } = item;
        const Key = {projectName, timeCreated}
        let result = await this.client.deleteItem({
          TableName: tableName,
          Key
        })
        results.push(result);
      }

      return results;
    } catch (error) {
      console.log("error:", error.message);
    }
  }

  async getApiId(tableName) {
    let deployments = await this.getDeployments(tableName);

    if (deployments.length === 0) return;
    let { apiId } = deployments[0].config.api;
    return apiId
  }
  async getNextVersionNumber(tableName) {
    const deployments = await this.getDeployments(tableName);

    if (deployments === undefined) return "1";

    const versions = deployments.map(deployment => parseInt(deployment.version, 10));


    let maxVersion = Math.max(...versions);

    return String(maxVersion+1);
  }

// timestamp: { S: '1619556774238' },
  async getDeployments(tableName) {
    try {
      const {Items} = await this.client.scan({
        TableName: tableName,
      });
      return Promise.resolve(Items.map(item => this.deformat(item)));
    } catch (e) {
      // console.log(e)
      return undefined;
    }
  }


  async addDeploymentToTable(tableName, items) {
    try {
      let confirmation = await this.client.putItem({
        TableName: tableName,
        Item: this.format(items)
      })
      return Promise.resolve(confirmation);
    } catch (error) {
      console.log("unable to add items: ", error.message)
    }
  }
}

module.exports = Dynamo;
