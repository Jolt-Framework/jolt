const walkDirs = require('./walkDirs');
const zipFunction = require("./zipFunction");
const S3 = require("../s3/s3");
const fs = require('fs');

const run = () => {
  const bucket = new S3("s3-massive-upload-test");

  walkDirs('../testZone/functions/', (filePath) => {
    const file = zipFunction(filePath);
    // // const fileStream = fs.createReadStream(filePath);
    //  const files = fs.readFileSync(filePath);
    // console.log(file, files);
    bucket.uploadObject(file, filePath);
    // console.log("created: ", location);
  })
}

run();


// const path = require("path");
// const file = config.file; // Path to and name of object. For example '../myFiles/index.js'.
// const fileStream = fs.createReadStream(file);

// // const content = fs.readFileSync(config.file).toString();

// // const file = new Zip();
// // file.addFile(config.fileName, Buffer.from(content))
// // file.writeZip(`./${config.fileName}.zip`);

// const uploadParams = { 
//   Bucket: config.bucket,
//   Body: fileStream,
//   Key: path.basename(file),
//   ContentType: "text/html"
// };