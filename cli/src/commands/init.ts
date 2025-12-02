import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface InitOptions {
  name?: string;
  template?: string;
}

export async function initCommand(options: InitOptions) {
  console.log(chalk.blue('🚀 Initializing NodeDrop project...'));

  let projectName = options.name;
  let template = options.template;

  // If no name provided, ask for it
  if (!projectName) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'What is your project name?',
        default: 'my-nodedrop-project',
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Project name cannot be empty';
          }
          return true;
        }
      }
    ]);
    projectName = answers.projectName;
  }

  // If no template specified, ask for it
  if (!template) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: [
          { name: 'Basic - Simple workflow setup', value: 'basic' },
          { name: 'Advanced - Full featured setup', value: 'advanced' }
        ]
      }
    ]);
    template = answers.template;
  }

  const projectPath = path.join(process.cwd(), projectName!);

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(chalk.red(`❌ Directory ${projectName} already exists!`));
    process.exit(1);
  }

  try {
    // Clone the NodeDrop repository
    console.log(chalk.yellow('📦 Cloning NodeDrop repository...'));
    execSync(`git clone https://github.com/your-org/node-drop.git ${projectName}`, {
      stdio: 'inherit'
    });

    // Navigate to project directory
    process.chdir(projectPath);

    // Remove .git directory to start fresh
    if (fs.existsSync('.git')) {
      execSync('rm -rf .git', { stdio: 'inherit' });
    }

    // Install dependencies
    console.log(chalk.yellow('📚 Installing dependencies...'));
    execSync('npm install', { stdio: 'inherit' });

    // Create environment files
    console.log(chalk.yellow('⚙️ Setting up environment...'));
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
    }
    if (fs.existsSync('backend/.env.example')) {
      fs.copyFileSync('backend/.env.example', 'backend/.env');
    }

    // Initialize git repository
    execSync('git init', { stdio: 'inherit' });
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initial commit"', { stdio: 'inherit' });

    console.log(chalk.green('✅ NodeDrop project initialized successfully!'));
    console.log(chalk.blue('\n📋 Next steps:'));
    console.log(chalk.white(`  cd ${projectName}`));
    console.log(chalk.white('  nodedrop start'));
    console.log(chalk.white('\n🌐 Your NodeDrop platform will be available at http://localhost:3000'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to initialize project:'), error);
    process.exit(1);
  }
}