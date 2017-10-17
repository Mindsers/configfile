#!/usr/bin/env node

const program = require('commander')
const fs = require('fs')
const path = require('path')

const { deployCommand, modulesCommand } = require('../src/commands')

const { ConfigService } = require('../src/services/config')
const { FileService } = require('../src/services/file')

const packageData = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')))
const optionsFilePath = packageData.config.optionsFilePath.replace('~', process.env.HOME)

const configService = new ConfigService(optionsFilePath)
const fileService = new FileService(configService)

program
  .version(packageData.version)
  .description('Configuration modules manager.')

program
  .command('list')
  .alias('l')
  .description('list all modules available.')
  .action(modulesCommand(fileService))

program
  .command('deploy [modules...]')
  .alias('d')
  .description('deploy configuration files.')
  .action(deployCommand(fileService))

program.parse(process.argv)