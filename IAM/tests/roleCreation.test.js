const { LambdaAssumeRoleDocumentPolicy } = require("../constants/policyConstants");
const IAMWrapper = require("../iam")
let client;
let role;
const roleName = "the-lambda-role"
async function test() {
  client = await new IAMWrapper()
  // console.log("the client", client)
  
  role = await client.createRole(roleName, LambdaAssumeRoleDocumentPolicy)
  console.log("successfully created role: ", roleName)
  teardown()
}

async function teardown() {
  client = await new IAMWrapper()
  client.deleteRole(roleName)
}

test();
// teardown();