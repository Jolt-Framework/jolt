const { LambdaAssumeRoleDocumentPolicy, ReadOnlyLambdaPolicy } = require("../constants/policyConstants");
const IAMWrapper = require("../iam")
let client;
let role;
// let policyArn;
const roleName = "the-lambda-role"
const policyName = "the-lambda-policy"
async function test() {
  client = await new IAMWrapper()
  
  role = await client.createRole(roleName, LambdaAssumeRoleDocumentPolicy);
  let policy = await client.createPolicyForRole(roleName, policyName, ReadOnlyLambdaPolicy);
  // console.log("the outer policy: ", policy)
  let policyArn = policy.Arn;
  return policyArn
  // teardown()
}

async function teardown(policyArn) {
  client = await new IAMWrapper()
  await client.detachPolicyFromRole(roleName, policyArn)
  await client.deletePolicy(policyName, policyArn)
  await client.deleteRole(roleName)
}
const run = async (result) => {
  if (!result) result = await test();
  await teardown(result);
}
run()