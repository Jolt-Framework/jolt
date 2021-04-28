const S3 = require("./s3")

const config = require('../Core/config.json')

const { bucket } = config.deploy;
const run = async () => {
  await S3.teardownAll(bucket)
}

run()