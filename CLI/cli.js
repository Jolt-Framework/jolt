#!/usr/bin/env node

const { Command } = require('commander');
const init = require('./commands/init');
// const { help } = require("./commands/help");
const deploy = require("./commands/deploy");
const update = require("./commands/update");
const secrets = require("./commands/secrets");
// const { destroy } = require("./commands/destroy");

const program = new Command();
// const version = require("../package.json").version;
// program.version(version).description("COREpack");

// Init
program
  .command("init")
  .alias("i")
  .description("Create a COREpack application")
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
// Init
program
  .command("secrets")
  .alias("s")
  .description("Send all environment variables (found in .env files) to associated Lambdas")
  .action(secrets);

// // Destroy
// program
//   .command("destroy")
//   .alias("destroy")
//   .description("Deletes a COREpack application")
//   .action(destroy);

program.parse(process.argv);
