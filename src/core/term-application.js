import { AbstractApplication, LoggerService } from 'yabf'
import program from 'commander'

import { MessageService } from '../services'

import { Command } from './command'

export class TermApplication extends AbstractApplication {
  get version() {
    return this._version || '0.0.0'
  }

  set version(semanticVersion) {
    this._version = semanticVersion
  }

  get description() {
    return this._desc
  }

  set description(text) {
    this._desc = text
  }

  constructor(injector, messageService, loggerService) {
    super(injector)

    this.messageService = messageService
    this.loggerService = loggerService

    this.log = this.loggerService.registerScope('configfile:app')
  }

  buildInstructions() {
    return [
      { provide: TermApplication, dependencies: [MessageService, LoggerService] },
      { provide: MessageService, dependencies: [] }
    ]
  }

  register(command, deps = []) {
    this.log(`Register new command ${command.prototype.constructor.name}`)

    if (!(command.prototype instanceof Command)) {
      this.log(`${command} is not a valid command`)
      return null
    }

    this.commands = [command, ...(this.commands || [])]
    this.injectorService.provide(command, deps, false)
  }

  start() {
    if (!Array.isArray(this.commands) || this.commands.length < 1) {
      this.log(`No command found in Term Application`)
      this.messageService.printError('Application failed to initialize')
      return
    }

    program
      .version(this.version)
      .description(this.description)

    for (const commandClass of this.commands) {
      const controller = this.injectorService.get(commandClass)

      let command = program.command(controller.commandName)

      if (controller.alias != null) {
        command = command.alias(controller.alias)
      }

      if (controller.alias != null && controller.description.length > 0) {
        command = command.description(controller.description)
      }

      if (Array.isArray(controller.options)) {
        for (const [option, optionDesc] of controller.options) {
          command = command.option(option, optionDesc)
        }
      }

      if ('run' in controller && typeof controller.run === 'function') {
        const action = controller.run.bind(controller)
        const wrappedAction = this._wrapActions(action)

        command.action(wrappedAction)
      }
    }

    this.log(`Program start`)
    this.log(`Program launched with ${JSON.stringify(process.argv)}`)
    program.parse(process.argv)
  }

  _wrapActions(action) {
    return (...args) => {
      try {
        action(...args)
      } catch (error) {
        this.log(`Program failed by error : ${error.message}`)
        this.messageService.printError('Fail', 'An error occured.')
      }
    }
  }
}
