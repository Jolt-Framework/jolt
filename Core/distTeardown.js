const Gateway = require('../APIGateway/gateway');
const Teardown = require('../Teardown/teardown');

const deployment = {
  lambdas: [
    'arn:aws:lambda:us-east-1:886346126803:function:createNote:9',
    'arn:aws:lambda:us-east-1:886346126803:function:deleteNote:9',
    'arn:aws:lambda:us-east-1:886346126803:function:getNotes:9',
    'arn:aws:lambda:us-east-1:886346126803:function:updateNote:9'
  ],
  region: 'us-east-1',
  bucket: 'new-bucket-etwesfchdyx',
  api: Object.assign(new Gateway('testName'), {
    apiName: 'testName',
    url: 'https://rsofd6pr97.execute-api.us-east-2.amazonaws.com',
    apiId: 'rsofd6pr97'
  })
}
let teardown = new Teardown(deployment)

const run = async () => {
  console.log("beginning teardown")
  await teardown.all()
  console.log("teardown complete")
}

run()