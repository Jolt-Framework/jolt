const AWS = require("@aws-sdk/client-dynamodb");
const getAccountId = require("./getAccountId");

const Constants = require("../lib/constants/DynamoConstants");
const { DEFAULT_REGION } = require("../lib/constants/global");

class Dynamo {
  static all = [];
  constructor(region = DEFAULT_REGION) {
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
            AttributeName: Constants.SCHEMA_ATTRIBUTE_PROJECT,
            KeyType: Constants.SCHEMA_KEY_TYPES.HASH,
          },
          {
            AttributeName: Constants.SCHEMA_ATTRIBUTE_VERSION,
            KeyType: Constants.SCHEMA_KEY_TYPES.RANGE,
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: Constants.SCHEMA_ATTRIBUTE_PROJECT,
            AttributeType: Constants.SCHEMA_ATTRIBUTE_TYPES.STRING,
          },
          {
            AttributeName: Constants.SCHEMA_ATTRIBUTE_VERSION,
            AttributeType: Constants.SCHEMA_ATTRIBUTE_TYPES.STRING,
          },
        ],
        BillingMode: Constants.TABLE_BILLING_MODE,
        Tags: [
          {
            Key: Constants.TABLE_TAG.KEY,
            Value: Constants.TABLE_TAG.VALUE,
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
        case Constants.ERROR_RESOURCE_BUSY: {
          this.table = await this.client.describeTable({
            TableName: tableName,
          });

          return this.table;
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
      let value = items[key][Constants.SCHEMA_ATTRIBUTE_TYPES.STRING];
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
      let value = items[key][Constants.SCHEMA_ATTRIBUTE_TYPES.STRING];
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
      if (typeof item !== Constants.TYPE_STRING) item = JSON.stringify(item);
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
      throw new Error(error.message);
    }
  }

  static async deleteItem(tableName, projectName, timeCreated) {
    try {
      await (new AWS.DynamoDB({region: "us-east-1"})).deleteItem({
        TableName: tableName,
        Key: {
          projectName, timeCreated
        }
      })
    } catch (error) {
      throw new Error(error.message);
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

    if (deployments === undefined) return Constants.ONE_STRING;
    if (deployments.length === 0) return Constants.ONE_STRING;

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
      let db = new AWS.DynamoDB({ region });
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
      throw new Error(Constants.ERROR_UNABLE_TO_ADD_ITEMS + error.message);
    }
  }

  static async updateProjectVersion(tableName, version) {
    version = String(version);

    const arn = await Dynamo.#getDbArn(tableName);

    await new AWS.DynamoDB({
      region: Dynamo.config.AWSInfo.AWS_REGION,
    }).tagResource({
      ResourceArn: arn,
      Tags: [
        {
          Key: Constants.TABLE_TAG.KEY,
          Value: version,
        },
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

    return tags.Tags.find((tag) => tag.Key === Constants.TABLE_TAG.KEY).Value;
  }

  static async getProjects() {
    const db = new AWS.DynamoDB({ region: Dynamo.config.AWSInfo.AWS_REGION });
    const listTablesResponse = await db.listTables({});
    const tableNames = listTablesResponse.TableNames;

    const joltTables = {};
    for (const tableName of tableNames) {
      let tableTags = await db.listTagsOfResource({
        ResourceArn: await Dynamo.#getDbArn(tableName),
      });
      if (tableTags.Tags.find((tag) => tag.Key === Constants.TABLE_TAG.KEY)) {
        let projectName = tableName
          .split(Constants.DASH_STRING)
          .slice(0, -1)
          .join(Constants.DASH_STRING);

        joltTables[projectName] = tableName;
      }
    }

    return joltTables;
  }
}

module.exports = Dynamo;
