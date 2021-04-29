const Dynamo = require("../Dynamo/dynamo");
const Teardown = require("../Teardown/teardown");
const { projectName, tableName } = require('./config.json')

const run = async () => {
  try {
    let dynamo = new Dynamo()
    await dynamo.createTable(tableName);
    let items = await dynamo.getItems(tableName);
    // await dynamo.addItemsToTable(tableName, {
    //   projectName,
    //   timeCreated: new Date().toString(),
    //   third: "hey ezra"
    // })
    console.log(items);
  } catch (error) {
    console.log(error.message)
  }


}


run()