#!/usr/bin/env node

const { Command } = require('commander');
const init = require('./commands/init');
const deploy = require("./commands/deploy");
const update = require("./commands/update");
const dev = require("./commands/dev");
const runFunctions = require("./commands/runFunctions");

const lambda = require("./commands/lambda");
// const { destroy } = require("./commands/destroy");
const projects = require("./commands/rollback");
const remove = require("./commands/delete");
const program = new Command();
// const version = require("../package.json").version;
// program.version(version).description("Jolt");

// Init
program
  .command("init")
  .alias("i")
  .description("Create a Jolt application")
  .action(init);

// // Help
// program
//   .command("help")
//   .alias("h")
//   .description("Shows help information for a command")
//   .action(help);

// Deploy
program
  .command("deploy")
  .alias("d")
  .description("Provision AWS infrastucture, build your application and deploy everything to AWS")
  .action(deploy);

program
  .command("update")
  .alias("u")
  .description("Update an existing deployment with your current codebase")
  .action(update);

program
  .command("dev")
  .description("Creates a local testing environment that runs application and serverless functions")
  .action(dev);

program
  .command("functions")
  .alias("f")
  .description("Run lambdas locally from your functions folder")
  .action(runFunctions);

program
  .command("rollback")
  .alias("r")
  .description("Change the version of an application.")
  .action(projects);

program
  .command("lambda")
  .alias("l")
  .description("Generate a new lambda function handler in your functions folder")
  .action(lambda);

program.command("delete")
  .alias("del")
  .description("delete a version of an application")
  .action(remove);

program.on('command:*', (command) => {
  console.log(`Command '${command}' not recognized`);
  program.help();
})
// program
//   .command("run")
//   .alias("r")
//   .description("List projects and make changes.")
//   .action(projects);

// // Destroy
// program
//   .command("destroy")
//   .alias("destroy")
//   .description("Deletes a Jolt application")
//   .action(destroy);

program.parse(process.argv);
