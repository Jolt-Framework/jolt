const AWS = require("@aws-sdk/client-dynamodb")

class Dynamo {
  static all = []
  constructor(region) {
    region ||= "us-east-1";
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
          AttributeName: "timeCreated",
          KeyType: 'RANGE',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: "projectName",
            AttributeType: 'S',
          },
          {
            AttributeName: "timeCreated",
            AttributeType: 'S',
          },
        ],
        BillingMode: "PAY_PER_REQUEST"
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
  format({ projectName, bucket, ...config }) {
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
      timeCreated: {
        S: Date.now().toString(),
      },
      config: {
        S: JSON.stringify(config),
      }
    }
    return items
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
    return result;
  }
  formatStrings(items) {
    let keys = Object.keys(items)
    let result = {}
    keys.forEach(key => {
      let item = items[key]
      if( typeof item !== "string") JSON.stringify(item)
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
// timestamp: { S: '1619556774238' },
  async getItems(tableName) {
    let item;
    try {
      const {Items} = await this.client.scan({
        TableName: tableName,
      });
      return Promise.resolve(Items.map(item => this.deformat(item)));
    } catch (e) {
      // console.log(e)
      throw new Error(e.message);
    }
  }

  async addItemsToTable(tableName, items) {
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