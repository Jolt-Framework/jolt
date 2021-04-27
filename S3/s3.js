const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  ListObjectsCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");

const fs = require("fs");
const Mime = require('mime-types');

class S3 {
  static Client = new S3Client({
    region: process.env.REGION || "us-east-1",

  });

  constructor(bucketName) {
    this.bucketName = bucketName;
    // this.createBucket();
  }
  async makePublic(key) {
    let confirmation;
    try {
      confirmation = await S3.Client.makePublic(key)
    } catch (error) {
      console.log(`unable to make this bucket public`)
    }

    return Promise.resolve(confirmation)
  }

  async createBucket() {
    if (!(await S3.#bucketExists(this.bucketName))) {
      const bucketParams = { Bucket: this.bucketName };

      console.log("Creating bucket...")
      try {
        await S3.Client.send(new CreateBucketCommand(bucketParams));
        console.log(`Successfully created the bucket:${this.bucketName}`);
      } catch (err) {
        throw new Error(`someone else has that bucket name or it's not accessible to you, error: ${err.message}`);
      }
    } else {
      console.log("Bucket already exists.");
    }
  }

  async uploadObject(fileBuffer, fileName, pub = false) {
    const objectParams = {
      Bucket: this.bucketName,
      Body: fileBuffer,
      Key: fileName,
      ContentType: Mime.lookup(fileName),
    };
    if (!!pub) objectParams.ACL = "public-read";

    try {
      const res = await S3.Client.send(new PutObjectCommand(objectParams));
      console.log(`${fileName} uploaded to S3`);
    } catch(err) {
      console.log(`Error occurred creating file ${fileName}:\n${err}`);
    }
  }

  static async teardown(Bucket) {
    try {
      const bucketParams = {Bucket};
      const {Contents} = await this.Client.send(new ListObjectsCommand(bucketParams));

      if (Contents) {
        const Objects = Contents.map(({Key}) => ({Key}));
        const deleteObjectsParams = Object.assign({Delete: {Objects}}, bucketParams);

        await this.Client.send(new DeleteObjectsCommand(deleteObjectsParams));

        console.log("Objects deleted");
      }

      await this.Client.send(new DeleteBucketCommand(bucketParams))
      console.log("Bucket deleted");
    } catch(err) {
      console.log("Deleting bucket failed with:\n", err.message);
    }
  }

  static async #bucketExists(name) {
    let response;
    try {
      response = await S3.Client.send(new HeadBucketCommand({Bucket: name }));
      return true;
    } catch (error) {
      return false;
    }
    // console.log(response);
    // return response['$metadata'].httpStatusCode === 200;
  }
}

// const run = async () => {
//   const bucket = await new S3("christianandowensbucket");
//   setTimeout(() => { S3.teardown("christianandowensbucket")}, 5000)
  // bucket.bucketExists();
  // console.log(await S3.bucketExists("christianandowensbucket"));
  // const fileName = "functions/hello.js";
  // const file = fs.readFileSync(fileName);

  // bucket.uploadObject(file, fileName);
// }

// run();

module.exports = S3;