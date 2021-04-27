const Dynamo = require("../Dynamo/dynamo");
const run = async () => {
  try {
    const uuidv4 = require("uuid").v4()
    const db = new Dynamo()
  
    console.log('creating dynamo table');

    // const table = await db.createTable("CoreJamstack" + uuidv4);
    console.log('adding items');
    const items = await db.addItems({
      lambdas: [
        'arn:aws:lambda:us-east-1:886346126803:function:createNote:14',
        'arn:aws:lambda:us-east-1:886346126803:function:deleteNote:14',
        // 'arn:aws:lambda:us-east-1:886346126803:function:getNotes:14',
        'arn:aws:lambda:us-east-1:886346126803:function:updateNote:14',
        'arn:aws:lambda:us-east-1:886346126803:function:edge-proxy:10'
      ],
      deployed: true,
      region: 'us-east-1',
      projectName: "testApp",
      bucketName: 'new-bucket-etwesfchdyx1',
      api: {
        apiName: 'testName',
        url: 'https://7yki6ogr7j.execute-api.us-east-1.amazonaws.com',
        apiId: '7yki6ogr7j'
      },
      cloudfrontId: 'E1DI8SOZHQDW21',
      domainName: 'd3lud355m027lp.cloudfront.net'
    })
    
    // console.log("table: ", table);
    console.log("items: ", items);
  } catch (error) {
    console.log(error.message);
  }
}

run()