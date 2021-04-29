const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,

  ListObjectsCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  PutBucketVersioningCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const fs = require("fs");
const Mime = require('mime-types');

class S3 {
  static Client = new S3Client({
    region: process.env.REGION || "us-east-1",

  });

  constructor(bucketName, deployment) {
    this.bucketName = bucketName;
    this.deployment = deployment;
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

        try {
          await S3.Client.send(new PutBucketVersioningCommand({
            Bucket: this.bucketName,
            VersioningConfiguration: {
              Status: "Enabled"
            }
          }))
        } catch (error) {
          throw new Error(`Bucket versioning could not be enabled, error: ${error.message}`);
        }

      } catch (error) {
        throw new Error(`someone else has that bucket name or it's not accessible to you, error: ${error.message}`);
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

      const VersionId = res.VersionId;
      let Key = fileName;
      return {Key, VersionId};
    } catch(error) {
      console.log(`Error occurred creating file ${fileName}:\n${error.message}`);
    }
  }

  static async teardown(Bucket, Objects) {
    // given bucketName and an array of {fileName, version}
    if (Objects.length === 0) return;
    try {
       console.log(`marking current distribution objects for deletion`);
      for (const object of Objects) {
          await this.Client.send(new DeleteObjectCommand({
            Bucket,
            ...object,
          }));
        }
     

      console.log("Objects deleted");
      
    } catch (error) {
      console.log("Deleting versioned objects failed with:\n", error.message);
      this.teardownAll(bucketName);
    }
  }

  static async teardownAll(Bucket) {
    try {
      const bucketParams = { Bucket };


        let Objects = await this.Client.send(new ListObjectVersionsCommand({
          Bucket,
          KeyMarker: "/",
        }));

        Objects = Objects.Versions.map(({ Key, VersionId }) => {
          return {Key, VersionId};
        });

        for (const object of Objects) {
          await this.Client.send(new DeleteObjectCommand({
            Bucket,
            ...object,
          }));
          console.log(`${object.key} Marked for deletion`);
        }


        // const Contents = await this.Client.send(
        //   new ListObjectsCommand(bucketParams)
        //   );
        // let Objects = Contents;
        // console.log(Contents);
        // deleteObjectsParams = { Objects: Objects.map(({ Key }) => {
        //   return { Key, Bucket};
        // }) }

        // await this.Client.send(new DeleteObjectsCommand(deleteObjectsParams));
        // console.log("Objects deleted");

      await this.Client.send(new DeleteBucketCommand(bucketParams))
      console.log("Bucket deleted");
    } catch(error) {
      console.log("Deleting bucket failed with:\n", error.message);
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