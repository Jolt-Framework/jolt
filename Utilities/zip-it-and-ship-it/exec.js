const walkDirs = require('../core-jamstack/useful-utilities/walkDirs')

const { zipFunction } = require('./src/main')

const test = async () => {
  await walkDirs('functions', async (path) => {
    await zipFunction(path, 'archives')
  })
}

test()
