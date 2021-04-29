const path = require("path");

const lambdaFileToName = (text) => {
  return path.basename(text, path.extname(text));  
}

const lambdaARNToName = (text) => {
	const sections = text.split(":");
	return sections[sections.length - 1];
}

module.exports = { lambdaFileToName, lambdaARNToName };
