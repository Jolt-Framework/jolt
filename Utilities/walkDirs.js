const fs = require('fs');
const path = require("path");

const walkDirs = async (currentLocation, callback) => {
  if (fs.statSync(currentLocation).isFile()) {
    await callback(currentLocation);
  } else {
    const files = fs.readdirSync(currentLocation)
    for (let i = 0; i < files.length; i++) {
      await walkDirs(path.join(currentLocation, files[i]), callback);
    }
  }
}

module.exports = walkDirs;
