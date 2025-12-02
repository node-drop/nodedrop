import chalk from 'chalk';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';

interface StartOptions {
  detached?: boolean;
  port?: string;
}

export async function startCommand(options: StartOptions) {
  console.log(chalk.blue('🚀 Starting NodeDrop platform...'));

  // Check if we're in a NodeDrop project
  if (!fs.existsSync('package.json')) {
    console.error(chalk.red('❌ No package.json found. Are you in a NodeDrop project?'));
    console.log(chalk.yellow('💡 Run "nodedrop init" to create a new project.'));
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.name !== 'node-drop') {
    console.error(chalk.red('❌ This doesn\'t appear to be a NodeDrop project.'));
    console.log(chalk.yellow('💡 Run "nodedrop init" to create a new project.'));
    process.exit(1);
  }

  try {
    // Set environment variables
    if (options.port) {
      process.env.PORT = options.port;
      process.env.FRONTEND_PORT = options.port;
    }

    // Check if Docker is available
    let useDocker = false;
    try {
      execSync('docker --version', { stdio: 'ignore' });
      useDocker = true;
      console.log(chalk.green('🐳 Docker detected, using containerized setup'));
    } catch {
      console.log(chalk.yellow('⚠️ Docker not found, using local development setup'));
    }

    if (useDocker) {
      // Start with Docker
      if (options.detached) {
        console.log(chalk.yellow('🔧 Starting in detached mode...'));
        execSync('npm run docker:dev', { stdio: 'inherit' });
        console.log(chalk.green('✅ NodeDrop started in background'));
        console.log(chalk.blue(`🌐 Platform available at http://localhost:${options.port || '3000'}`));
        console.log(chalk.white('📋 Use "nodedrop stop" to stop the platform'));
      } else {
        console.log(chalk.yellow('🔧 Starting in interactive mode...'));
        const child = spawn('npm', ['run', 'docker:dev'], {
          stdio: 'inherit',
          shell: true
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n🛑 Shutting down NodeDrop...'));
          child.kill('SIGINT');
          process.exit(0);
        });
      }
    } else {
      // Start with local development
      if (options.detached) {
        console.log(chalk.yellow('🔧 Starting in detached mode...'));
        const child = spawn('npm', ['run', 'dev'], {
          detached: true,
          stdio: 'ignore',
          shell: true
        });
        child.unref();
        console.log(chalk.green('✅ NodeDrop started in background'));
        console.log(chalk.blue(`🌐 Platform available at http://localhost:${options.port || '3000'}`));
      } else {
        console.log(chalk.yellow('🔧 Starting in interactive mode...'));
        const child = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          shell: true
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n🛑 Shutting down NodeDrop...'));
          child.kill('SIGINT');
          process.exit(0);
        });
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Failed to start NodeDrop:'), error);
    process.exit(1);
  }
}