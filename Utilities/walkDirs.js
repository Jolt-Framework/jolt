const fs = require('fs');
const path = require("path");

const walkDirs = async (currentLocation, callback) => {
  if (fs.statSync(currentLocation).isFile()) {
    await callback(currentLocation);
  } else {
    if (currentLocation.includes('node_modules')) return;

    const files = fs.readdirSync(currentLocation)

    for (const file of files) {
      await walkDirs(path.join(currentLocation, file), callback);
    }
  }
}

module.exports = walkDirs;
