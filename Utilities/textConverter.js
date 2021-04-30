const path = require("path");

const lambdaFileToName = (text) => {
  return path.basename(text, path.extname(text));
}

const lambdaARNToName = (text) => {
	const sections = text.replace(/:\d+$/, "").split(":");
	const lastSection = sections[sections.length - 1];
	if (String(Number(lastSection)) === lastSection) {
		return sections[sections.length - 2];
	} else {
		return lastSection;
	}
}

module.exports = { lambdaFileToName, lambdaARNToName };
