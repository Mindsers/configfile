#!/usr/bin/env node

// program
//   .version(config.package.version)
//   .description('Configuration files manager.')

const { TermApplication, Command, InitCommand, ConfigService } = require('../src')
const { getOptionsFilePath, getPackageData } = require('../src/shared/utils')

;(() => {
  const cli = TermApplication.createInstance()
  const pkg = getPackageData()

  cli.version = pkg.version

  cli.provide(ConfigService, [{ useValue: getOptionsFilePath() }])

  cli.register(InitCommand, [ConfigService])
  cli.register(class extends Command { // modules namespace
    get commandName() {
      return 'modules'
    }

    get alias() {
      return 'm'
    }

    get description() {
      return 'work with modules available.'
    }
  })

  cli.register(class extends Command { // scripts namespace
    get commandName() {
      return 'scripts'
    }

    get alias() {
      return 's'
    }

    get description() {
      return 'work with custom scripts available.'
    }
  })

  cli.start()
})()
