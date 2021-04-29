const spawn = require("child_process").spawnSync;

/*
 * Run build commands
 */
class Builder {
  /**
   * @param {string} command command to compile static assets
   */
  constructor(command) {
    this.command = command;
  }

  #built = false;

  async build() {
    if (this.#built === true) return true;
    const parts = this.command.split(" ");
    const cmd = parts[0];
    const argv = parts.slice(1);
    spawn(cmd, argv, { stdio: 'inherit'});
    return true;
  }
}

module.exports = Builder;