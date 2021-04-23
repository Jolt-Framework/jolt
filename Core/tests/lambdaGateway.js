



async function test() {

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

