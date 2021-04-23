module.exports = {
  toFunctionName: (srcPath) =>
    srcPath
      .split(/functions/)
      .slice(1)
      .join('functions')
      .split('/')
      .slice(1)
      .join('-'),
}
