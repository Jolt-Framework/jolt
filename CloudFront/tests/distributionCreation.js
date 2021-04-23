const { LambdaAssumeRoleDocumentPolicy } = require("../constants/policyConstants");
const CloudFrontWrapper = require("../cloudfront")
const bucketName = "exampleBucket" // bucket name
const bucketDomainName = bucketName + ".s3.us-east-2.amazonaws.com" // not the s3-website
const proxyARN = "arn:aws:lambda:us-east-1:accountId:function:functionName" // arn to specific lambda
const reference = new require('uuid').v4()

async function test() {
  let client = await new CloudFrontWrapper("us-east-2")
  client.createDistribution(bucketDomainName, bucketName, proxyARN, reference)
    .then(({ Id }) => {
      console.log("passed in id, ", Id)
      teardown(Id)
    })
  // console.log( "this is the distro, ", distribution)
}

async function teardown(id) {
  let client = await new CloudFrontWrapper("us-east-2")

  const res = await client.disableDistribution(id)

  const confirmation = await client.deleteDistribution(id)
  console.log("the confirmation", confirmation)
}

test();
// teardown("E341C2UWDNZGLP");
// teardown("EQRG1MS7TLL1V")

// git commit -m "Cloudfront finished - uses exponential backoffs for delete.



// Co-authored-by: Ezra Ellette <ezrasellette@gmail.com>
// Co-authored-by: Rodney Matambo < rmatambo8@icloud.com>"

