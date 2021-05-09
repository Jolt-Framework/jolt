const { Buffer } = require('buffer')
const fs = require('fs')
const os = require('os')
const { basename, extname, join, normalize, sep } = require('path')
const { promisify } = require('util')

const copyFile = require('cp-file')
const deleteFiles = require('del')
const makeDir = require('make-dir')
const pMap = require('p-map')
const unixify = require('unixify')

const { startZip, addZipFile, addZipContent, endZip } = require('./archive')
const { ARCHIVE_FORMAT_ZIP } = require('./utils/consts')
const { toFunctionName } = require('./utils/core_utils')

const pStat = promisify(fs.stat)
const pWriteFile = promisify(fs.writeFile)

// Taken from https://www.npmjs.com/package/cpy.
const COPY_FILE_CONCURRENCY = os.cpus().length === 0 ? 2 : os.cpus().length * 2

const createDirectory = async function ({
  aliases = {},
  basePath,
  destFolder,
  extension,
  filename,
  mainFile,
  pluginsModulesPath,
  srcFiles,
}) {
  const { contents: entryContents, filename: entryFilename } = getEntryFile({
    commonPrefix: basePath,
    filename,
    mainFile,
  })
  const functionFolder = join(destFolder, basename(filename, extension))
  // Deleting the functions directory in case it exists before creating it.
  await deleteFiles(functionFolder, { force: true })
  await makeDir(functionFolder)

  // Writing entry file.
  await pWriteFile(join(functionFolder, entryFilename), entryContents)

  // Copying source files.
  await pMap(
    srcFiles,
    (srcFile) => {
      const srcPath = aliases[srcFile] || srcFile
      const normalizedSrcPath = normalizeFilePath(srcPath, basePath, pluginsModulesPath)
      const destPath = join(functionFolder, normalizedSrcPath)

      return copyFile(srcFile, destPath)
    },
    { concurrency: COPY_FILE_CONCURRENCY },
  )

  return functionFolder
}

const createZipArchive = async function ({
  aliases,
  basePath,
  destFolder,
  extension,
  filename,
  mainFile,
  pluginsModulesPath,
  srcFiles,
}) {
  const destPath = join(destFolder, `${basename(toFunctionName(filename), extension)}.zip`)
  const { archive, output } = startZip(destPath)

  addEntryFile(basePath, archive, filename, mainFile)

  const srcFilesInfos = await Promise.all(srcFiles.map(addStat))
  // We ensure this is not async, so that the archive's checksum is
  // deterministic. Otherwise it depends on the order the files were added.
  srcFilesInfos.forEach(({ srcFile, stat }) => {
    zipJsFile({ srcFile, commonPrefix: basePath, pluginsModulesPath, archive, stat, aliases })
  })

  await endZip(archive, output)
  return destPath
}

const zipNodeJs = function ({ archiveFormat, ...options }) {
  if (archiveFormat === ARCHIVE_FORMAT_ZIP) {
    return createZipArchive(options)
  }
  return createDirectory(options)
}

const addEntryFile = function (commonPrefix, archive, filename, mainFile) {
  const { contents: entryContents, filename: entryFilename } = getEntryFile({ commonPrefix, filename, mainFile })
  const content = Buffer.from(entryContents)

  addZipContent(archive, content, entryFilename)
}

const addStat = async function (srcFile) {
  const stat = await pStat(srcFile)
  return { srcFile, stat }
}

const getEntryFile = ({ filename, mainFile }) => {
  // const mainPath = normalizeFilePath(mainFile, commonPrefix)
  const extension = extname(filename)
  const entryFilename = `${basename(toFunctionName(filename), extension)}.js`

  return {
    // eslint-disable-next-line node/no-sync
    contents: fs.readFileSync(mainFile).toString(),
    filename: entryFilename,
  }
}

const zipJsFile = function ({ srcFile, commonPrefix, pluginsModulesPath, archive, stat, aliases = {} }) {
  const filename = aliases[srcFile] || srcFile
  const normalizedFilename = normalizeFilePath(filename, commonPrefix, pluginsModulesPath)
  addZipFile(archive, srcFile, normalizedFilename, stat)
}

const ZIP_ROOT_DIR = 'node_modules'

// `adm-zip` and `require()` expect Unix paths.
// We remove the common path prefix.
// With files on different Windows drives, we remove the drive letter.
const normalizeFilePath = function (path, commonPrefix, pluginsModulesPath) {
  if (commonPrefix.split("/").slice(-2)[0] !== "node_modules") {
    commonPrefix = commonPrefix.split("/").slice(0,-2).join("/");
  }
  const pathA = normalize(path)
  const pathB =
    pluginsModulesPath === undefined ? pathA : pathA.replace(pluginsModulesPath, `${ZIP_ROOT_DIR}${sep}node_modules`)
    // const packageName = pathB.split('node_modules/')[1].split('/')[0]
    const pathC = pathB.replace(commonPrefix, `${ZIP_ROOT_DIR}${sep}`)
    // console.log(pathB);
  // const pathC = pathB.replace(commonPrefix, `${ZIP_ROOT_DIR}${sep}${packageName}/`)

  const pathD = unixify(pathC);
  return pathD
}


module.exports = { zipNodeJs }
