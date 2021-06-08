const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  PutBucketVersioningCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const Mime = require("mime-types");
const Constants = require("../lib/constants/S3Constants");
const { DEFAULT_REGION } = require("../lib/constants/global");

class S3 {
  static Client = new S3Client({
    region: DEFAULT_REGION,
  });

  constructor(bucketName, deployment) {
    this.bucketName = bucketName;
    this.deployment = deployment;
  }
  async makePublic(key) {
    let confirmation;
    try {
      confirmation = await S3.Client.makePublic(key);
    } catch (error) {
      throw new Error(Constants.ERROR_BUCKET_NOT_PUBLIC);
    }

    return Promise.resolve(confirmation);
  }

  async createBucket() {
    if (!(await S3.#bucketExists(this.bucketName))) {
      const bucketParams = { Bucket: this.bucketName };

      try {
        await S3.Client.send(new CreateBucketCommand(bucketParams));
        try {
          await S3.Client.send(
            new PutBucketVersioningCommand({
              Bucket: this.bucketName,
              VersioningConfiguration: {
                Status: Constants.BUCKET_VERSIONING_ENABLED,
              },
            })
          );
        } catch (error) {
          throw new Error(
            Constants.ERROR_BUCKET_CANNOT_BE_VERSIONED + error.message
          );
        }
      } catch (error) {
        throw new Error(
          Constants.ERROR_BUCKET_NAME_UNAVAILABLE + error.message
        );
      }
    }
  }

  async uploadObject(fileBuffer, fileName, pub = false) {
    const objectParams = {
      Bucket: this.bucketName,
      Body: fileBuffer,
      Key: fileName,
      ContentType: Mime.lookup(fileName),
    };

    if (!!pub) objectParams.ACL = Constants.OBJECT_PUBLIC_READ_ENABLED;

    try {
      const res = await S3.Client.send(new PutObjectCommand(objectParams));
      const VersionId = res.VersionId;
      let Key = fileName;
      return { Key, VersionId };
    } catch (error) {
      console.log(error);
      throw new Error(Constants.ERROR_FILE_COULD_NOT_BE_CREATED + fileName);
    }
  }

  async reuploadObject({ Key, VersionId }) {
    const objectParams = {
      Bucket: this.bucketName,
      Key,
      VersionId,
    };

    let obj;

    try {
      obj = await S3.Client.send(new GetObjectCommand(objectParams));
    } catch (error) {
      throw new Error(error.message);
    }

    const streamSegments = [];

    for await (let seg of obj.Body) {
      streamSegments.push(seg);
    }

    const objectBuffer = Buffer.concat(streamSegments);

    try {
      let res = await this.uploadObject(objectBuffer, Key, true);

      return res;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  static async teardown(Bucket, Objects) {
    if (Objects.length === 0) return;
    try {
      for (const object of Objects) {
        await this.Client.send(
          new DeleteObjectCommand({
            Bucket,
            ...object,
          })
        );
      }
    } catch (error) {
      this.teardownAll(Bucket);
    }
  }

  static async teardownAll(Bucket) {
    try {
      const bucketParams = { Bucket };

      let Objects = await this.Client.send(
        new ListObjectVersionsCommand({
          Bucket,
          KeyMarker: Constants.OBJECT_KEY_MARKER,
        })
      );

      Objects = Objects.Versions.map(({ Key, VersionId }) => {
        return { Key, VersionId };
      });

      for (const object of Objects) {
        await this.Client.send(
          new DeleteObjectCommand({
            Bucket,
            ...object,
          })
        );
      }

      await this.Client.send(new DeleteBucketCommand(bucketParams));
    } catch (error) {
      throw new Error(Constants.ERROR_DELETE_BUCKET_FAILED + error.message);
    }
  }

  static async #bucketExists(name) {
    let response;
    try {
      response = await S3.Client.send(new HeadBucketCommand({ Bucket: name }));
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = S3;
