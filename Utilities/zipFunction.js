const Zip = require('adm-zip');
const path = require("path");
const fs = require('fs');
// const fileStream = fs.createReadStream(file);

module.exports = (filePath) => {  
  const content = fs.readFileSync(filePath).toString();
  const fileName = path.basename(filePath, path.extname(filePath));
  
  const file = new Zip();
  file.addFile(fileName, Buffer.from(content))
  // return file.toBuffer();
  const writePath = path.join(__dirname, `../testZone/functions/index.zip`);
  file.writeZip(writePath);
  return fs.readFileSync(writePath);
}
  
//  const path = require("path");
// const file = config.file; // Path to and name of object. For example '../myFiles/index.js'.
// const fileStream = fs.createReadStream(file);
// 
// // const content = fs.readFileSync(config.file).toString();
// 
// const file = new Zip();
// // file.addFile(config.fileName, Buffer.from(content))
// file.writeZip(`./${config.fileName}.zip`);
// 
// const uploadParams = { 
//   Bucket: config.bucket,
  // Body: fileStream,
//   Key: path.basename(file),
//   ContentType: "text/html"eStream,
//   Key: path.basename(file),
//   ContentType: "text/html"
// }