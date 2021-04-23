const spawn = require("child_process").spawnSync;

/*
 * Run build commands
 */
class Builder {
  /**
   * @param {string} buildCommand command to compile static assets
   */
  constructor(buildCommand) {
    this.buildCommand = buildCommand;
  }

  #built = false;

  async build() {
    if (this.#built === true) return true;
    const parts = this.buildCommand.split(" ");
    const cmd = parts[0];
    const argv = parts.slice(1);
    spawn(cmd, argv, { stdio: 'inherit'});
    return true;
  }
}

module.exports = Builder;