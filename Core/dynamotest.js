const Dynamo = require("../Dynamo/dynamo");
const Teardown = require("../Teardown/teardown");
const { projectName, tableName } = require('./config.json')

const run = async () => {
  try {
    let dynamo = new Dynamo()
    const { Items } = await dynamo.getItems(tableName);
    console.log(Items)
    await dynamo.deleteItems(tableName, async ({ config }) => {
      // console.log(Object.keys(config));
      let teardown = new Teardown(config)
      await teardown.all()
    })
    
    await dynamo.deleteTable(tableName);
  } catch (error) {
    console.log(error.message)
  }
}


run()