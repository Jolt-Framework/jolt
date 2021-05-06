const AWS = require("@aws-sdk/client-dynamodb");
const getAccountId = require("./getAccountId");

class Dynamo {
  static all = [];
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
            KeyType: "HASH",
          },
          {
            AttributeName: "version",
            KeyType: "RANGE",
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: "projectName",
            AttributeType: "S",
          },
          {
            AttributeName: "version",
            AttributeType: "S",
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
        Tags: [
          {
            Key: "Core-Project-Version",
            Value: "",
          },
        ],
      });
      this.table = res;

      await AWS.waitForTableExists(
        {
          client: this.client,
          maxWaitTime: 30,
        },
        {
          TableName: tableName,
        }
      );

      return res;
    } catch (error) {
      switch (error.name) {
        case "ResourceInUseException": {
          this.table = await this.client.describeTable({
            TableName: tableName,
          });

          return this.table;
        }
        default: {
          console.log("table already exists, ", error.message);
        }
      }
    }
  }

  format({ projectName, bucket, version, description, ...config }) {
    const { cloudfrontId } = config;
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
      description: {
        S: description,
      },
      config: {
        S: JSON.stringify(config),
      },
    };

    return items;
  }

  deformat(items) {
    let keys = Object.keys(items);
    let result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      let value = items[key]["S"];
      try {
        result[key] = JSON.parse(value);
      } catch (error) {
        result[key] = value;
      }
    }
    return { ...result, ...result.config };
  }

  static deformat(items) {
    let keys = Object.keys(items);
    let result = {};
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      let value = items[key]["S"];
      try {
        result[key] = JSON.parse(value);
      } catch (error) {
        result[key] = value;
      }
    }
    return { ...result, ...result.config };
  }

  formatStrings(items) {
    let keys = Object.keys(items);
    let result = {};
    keys.forEach((key) => {
      let item = items[key];
      if (typeof item !== "string") item = JSON.stringify(item);
      result[key] = { S: item };
    });
    return result;
  }

  async deleteTable(tableName) {
    try {
      let confirmation = await this.client.deleteTable({
        TableName: tableName,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteItems(tableName, callback) {
    let results = [];
    try {
      let { Items } = await this.getItems(tableName);
      for (let index = 0; index < Items.length; index++) {
        const item = Items[index];

        if (callback) await callback(this.deformat(item));

        const { projectName, timeCreated } = item;
        const Key = { projectName, timeCreated };
        let result = await this.client.deleteItem({
          TableName: tableName,
          Key,
        });
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
    return apiId;
  }
  async getNextVersionNumber(tableName) {
    const deployments = await this.getDeployments(tableName);

    if (deployments === undefined) return "1";
    if (deployments.length === 0) return "1";

    const versions = deployments.map((deployment) =>
      parseInt(deployment.version, 10)
    );

    let maxVersion = Math.max(...versions);

    return String(maxVersion + 1);
  }

  async getDeployments(tableName) {
    try {
      const { Items } = await this.client.scan({
        TableName: tableName,
      });
      return Promise.resolve(Items.map((item) => this.deformat(item)));
    } catch (e) {
      return;
    }
  }

  static async getDeployments(tableName, region = "us-east-1") {
    try {
      let db = new AWS.DynamoDB({region});
      const { Items } = await db.scan({
        TableName: tableName,
      });
      return Promise.resolve(Items.map((item) => this.deformat(item)));
    } catch (e) {
      return undefined;
    }
  }

  async addDeploymentToTable(tableName, items) {
    try {
      let confirmation = await this.client.putItem({
        TableName: tableName,
        Item: this.format(items),
      });

      await Dynamo.updateProjectVersion(tableName, items.version);

      return Promise.resolve(confirmation);
    } catch (error) {
      console.log("unable to add items: ", error.message);
    }
  }

  static async updateProjectVersion(tableName, version) {
    version = String(version);

    const arn = await Dynamo.#getDbArn(tableName);

    await new AWS.DynamoDB({ region: Dynamo.config
    .AWSInfo.AWS_REGION }).tagResource({
      ResourceArn: arn,
      Tags: [
        {
          Key: "Core-Project-Version",
          Value: version,
        }
      ],
    });
  }

  static async #getDbArn(tableName) {
    const accountId = await getAccountId();
    const region = Dynamo.config.AWSInfo.AWS_REGION;
    return `arn:aws:dynamodb:${region}:${accountId}:table/${tableName}`;
  }

  static async getLatestVersion(tableName) {
    const db = new AWS.DynamoDB({ region: Dynamo.config.AWSInfo.AWS_REGION });
    let tags = await db.listTagsOfResource({
      ResourceArn: await Dynamo.#getDbArn(tableName),
    });

    return tags.Tags.find(tag => tag.Key === "Core-Project-Version").Value;
  }

  static async getProjects() {
    const db = new AWS.DynamoDB({ region: Dynamo.config.AWSInfo.AWS_REGION });
    const listTablesResponse = await db.listTables({});
    const tableNames = listTablesResponse.TableNames;

    const coreTables = {};
    for (const tableName of tableNames) {
      let tableTags = await db.listTagsOfResource({
        ResourceArn: await Dynamo.#getDbArn(tableName),
      });
      if (tableTags.Tags.find((tag) => tag.Key === "Core-Project-Version")) {
        let projectName = tableName.split("-").slice(0, -1).join("-");

        coreTables[projectName] = tableName;
      }
    }

    return coreTables;
  }
}

module.exports = Dynamo;
