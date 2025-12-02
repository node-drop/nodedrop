import { Command } from 'commander';
import chalk from 'chalk';
import axios from 'axios';
import inquirer from 'inquirer';

const nodesCommand = new Command('nodes');

// List all available nodes
nodesCommand
  .command('list')
  .description('List all available workflow nodes')
  .option('-a, --active', 'Show only active nodes')
  .option('-i, --inactive', 'Show only inactive nodes')
  .action(async (options) => {
    console.log(chalk.blue('📋 Listing workflow nodes...'));
    
    try {
      const response = await axios.get('http://localhost:5000/api/nodes');
      const nodes = response.data;
      
      let filteredNodes = nodes;
      if (options.active) {
        filteredNodes = nodes.filter((node: any) => node.active);
      } else if (options.inactive) {
        filteredNodes = nodes.filter((node: any) => !node.active);
      }
      
      if (filteredNodes.length === 0) {
        console.log(chalk.yellow('📭 No nodes found.'));
        return;
      }
      
      console.log(chalk.white('\n📦 Available Nodes:'));
      console.log(chalk.white('─'.repeat(50)));
      
      filteredNodes.forEach((node: any) => {
        const status = node.active ? chalk.green('✅ Active') : chalk.red('❌ Inactive');
        console.log(`${status} ${chalk.cyan(node.name)} - ${node.description}`);
        console.log(`   Type: ${node.type} | Version: ${node.version}`);
        console.log('');
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch nodes. Is the backend running?'));
      console.log(chalk.yellow('💡 Try running "nodedrop start" first.'));
    }
  });

// Create a new node
nodesCommand
  .command('create')
  .description('Create a new workflow node')
  .option('-n, --name <name>', 'Node name')
  .option('-t, --type <type>', 'Node type')
  .action(async (options) => {
    console.log(chalk.blue('🔧 Creating new workflow node...'));
    
    let nodeName = options.name;
    let nodeType = options.type;
    
    if (!nodeName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'nodeName',
          message: 'What is the node name?',
          validate: (input: string) => input.trim().length > 0 || 'Node name is required'
        }
      ]);
      nodeName = answers.nodeName;
    }
    
    if (!nodeType) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'nodeType',
          message: 'What type of node?',
          choices: [
            'trigger',
            'action',
            'condition',
            'transform',
            'integration'
          ]
        }
      ]);
      nodeType = answers.nodeType;
    }
    
    try {
      const response = await axios.post('http://localhost:5000/api/nodes', {
        name: nodeName,
        type: nodeType,
        description: `Custom ${nodeType} node`,
        version: '1.0.0'
      });
      
      console.log(chalk.green(`✅ Node "${nodeName}" created successfully!`));
      console.log(chalk.blue(`🆔 Node ID: ${response.data.id}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create node:'), error);
    }
  });

// Activate a node
nodesCommand
  .command('activate <nodeId>')
  .description('Activate a workflow node')
  .action(async (nodeId) => {
    console.log(chalk.blue(`🔄 Activating node ${nodeId}...`));
    
    try {
      await axios.patch(`http://localhost:5000/api/nodes/${nodeId}/activate`);
      console.log(chalk.green(`✅ Node ${nodeId} activated successfully!`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to activate node:'), error);
    }
  });

// Deactivate a node
nodesCommand
  .command('deactivate <nodeId>')
  .description('Deactivate a workflow node')
  .action(async (nodeId) => {
    console.log(chalk.blue(`🔄 Deactivating node ${nodeId}...`));
    
    try {
      await axios.patch(`http://localhost:5000/api/nodes/${nodeId}/deactivate`);
      console.log(chalk.green(`✅ Node ${nodeId} deactivated successfully!`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to deactivate node:'), error);
    }
  });

export { nodesCommand };