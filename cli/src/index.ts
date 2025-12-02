#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';
import { statusCommand } from './commands/status';
import { nodesCommand } from './commands/nodes';

const program = new Command();

program
  .name('nodedrop')
  .description('CLI tool for NodeDrop workflow automation platform')
  .version('1.0.0');

// Initialize a new NodeDrop project
program
  .command('init')
  .description('Initialize a new NodeDrop project')
  .option('-n, --name <name>', 'Project name')
  .option('-t, --template <template>', 'Project template (basic, advanced)', 'basic')
  .action(initCommand);

// Start the NodeDrop platform
program
  .command('start')
  .description('Start the NodeDrop platform')
  .option('-d, --detached', 'Run in detached mode')
  .option('-p, --port <port>', 'Port number', '3000')
  .action(startCommand);

// Stop the NodeDrop platform
program
  .command('stop')
  .description('Stop the NodeDrop platform')
  .action(stopCommand);

// Check platform status
program
  .command('status')
  .description('Check NodeDrop platform status')
  .action(statusCommand);

// Node management commands
program
  .command('nodes')
  .description('Manage workflow nodes')
  .addCommand(nodesCommand);

// Error handling
program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for a list of available commands.'));
  process.exit(1);
});

program.parse();