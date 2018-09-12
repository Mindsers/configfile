const path = require('path')

const { FsUtils, LogUtils } = require('../../shared/utils')
const { TargetFileAlreadyExist } = require('./target-file-already-exist.error')

class DeployService {
  constructor(eventManager) {
    this.eventManager = eventManager
  }

  async deployLocalFile({ source, target, global: isGlobalFile }, force = false) {
    if (isGlobalFile) {
      throw new TypeError('Unable to deploy global file as a local one.')
    }

    const dirname = path.dirname(target)
    if (!FsUtils.fileExist(dirname)) {
      await FsUtils.mkdirp(dirname)
    }

    let fileStats
    try {
      fileStats = await FsUtils.lstat(target)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }

      fileStats = null // No file exist at target. No stats data to provide
    }

    if (fileStats != null && force === false) {
      throw new TargetFileAlreadyExist(target)
    }

    try {
      return await FsUtils.copyFile(source, target)
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }

      LogUtils.log({ type: 'warn', message: `Unable to make a local copy ("${source}" => "${target}").` })
    }
  }

  async deployGlobalFile({ source, target, global: isGlobalFile }) {
    if (!isGlobalFile) {
      throw new TypeError('Unable to deploy local file as a global one.')
    }

    const dirname = path.dirname(target)
    if (!FsUtils.fileExist(dirname)) {
      await FsUtils.mkdirp(dirname)
      this.eventManager.emit('deploy.created', dirname)
    }

    try {
      const targetStat = await FsUtils.lstat(target)
      if (targetStat.isSymbolicLink()) {
        const linkSource = await FsUtils.readlink(target)

        if (linkSource === source) {
          await FsUtils.unlink(target)
          this.eventManager.emit('deploy.removed', target)
        }
      }

      if (targetStat.isFile() || targetStat.isDirectory()) {
        await FsUtils.rename(target, `${target}.old`)
        this.eventManager.emit('deploy.renamed', { old: target, new: `${target}.old` })
      }
    } catch (error) {
      if (error.code !== 'ENOENT') { // No file exist at file.target
        throw error
      }
    }

    try {
      await FsUtils.symlink(source, target)
      this.eventManager.emit('deploy.created', target)
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error
      }

      LogUtils.log({ type: 'warn', message: `Unable to link "${source}" => "${target}".` })
    }
  }
}

module.exports = exports = { DeployService }