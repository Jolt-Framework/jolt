const Dynamo = require("../../aws/dynamo");
const attachConfig = require("../../Utilities/attachConfig");
const prompts = require("prompts");
const JOLT = require("../../Jolt/jolt");

const projects = async () => {
  try {
    const config = require(process.env.PWD + "/config.json");
  } catch (error) {
    return console.log(
      "Please run 'jolt init' to initialize the project first"
    );
  }

  attachConfig();

  let questions = [selectTable, selectVersion, confirmRollback];

  let currentQuestion;

  let selectedTable;
  let version;

  for (let i = 0; i < questions.length;) {

    currentQuestion = questions[i];

    switch (currentQuestion) {
      case selectTable: {
        selectedTable = await currentQuestion();

        if (selectedTable === "cancel") return;
        else                            i++;

        continue;
      }
      case selectVersion: {
        version = await currentQuestion(selectedTable);

        if (version === "back") i--;
        else                    i++;
        continue;
      }
      case confirmRollback: {
        let update = await currentQuestion(version);
        if (update) {
          i++;

          let versions = await Dynamo.getDeployments(selectedTable);

          const rollbackData = versions.find(deployment => deployment.version === version);

          const bucket = {
            bucketName: rollbackData.bucket,
            objects: rollbackData.config.files,
          };

          const cloudfront = {
            cloudfrontId: rollbackData.distributionId,
            proxyARN: rollbackData.config.edgeLambdas[0],
          };

          console.log(`\x1b[33m◌\x1b[0m Rolling back...`);
          await JOLT.redeployStaticAssets(bucket.bucketName, bucket.objects);
          await Dynamo.updateProjectVersion(selectedTable, version);
          await JOLT.updateProxy(cloudfront.cloudfrontId, cloudfront.proxyARN);
          await JOLT.invalidateDistribution(cloudfront.cloudfrontId);
          console.log(`\x1b[32m✔\x1b[0m Rollback complete!`);
          console.log(`It may take some time for the rollback to fully propagate across CloudFront`);
        } else {
          i--;
        };
        continue;
      }
    }
  }
};

async function confirmRollback(version) {
  return await confirm("Are you sure you want to revert to version: " + version);
}

async function confirm(message) {
  const object = {
    type: 'confirm',
    name: 'value',
    message,
  }

  const { value: decision } = await prompts(object);
  return decision;
}

async function selectTable() {
  let projects = await Dynamo.getProjects();

  const tableChoices = Object.entries(projects).map(([projectName, tableName]) => {
    return { title: projectName, value: tableName };
  });

  tableChoices.push({title: "Cancel", value: "cancel"});

  const question1 = {
    type: 'select',
    name: 'value',
    message: 'Select a project',
    choices: tableChoices,
    initial: 0,
    onRender(color) {
      this.choices.slice(-1)[0].title = color.red("Cancel");
    },
  };

  const { value: selectedTable } = await prompts(question1);

  return selectedTable;
}

async function selectVersion(tableName) {
  let appVersions = await Dynamo.getDeployments(tableName);
  let latestVersion = await Dynamo.getLatestVersion(tableName);

  const versionChoices = appVersions.map(version => {
    return { title: `${version.version} - ${version.description}` , value: version.version };
  });

  const initialIndex = versionChoices.findIndex(choice => String(choice.value) === latestVersion);

  versionChoices[initialIndex].disabled = true;

  const question2 = {
    type: 'select',
    name: 'value',
    message: 'Select a Version',
    choices: versionChoices,
    warn: "current version",
    onRender(color) {
      this.choices.slice(-1)[0].title = color.yellow("<- Back");
    },
    initial: initialIndex,
  }

  versionChoices.push({ title: "<- Back", value: "back" });

  const { value: version } = await prompts(question2);

  return version;
}

module.exports = projects;
