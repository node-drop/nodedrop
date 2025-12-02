import chalk from 'chalk';
import { execSync } from 'child_process';
import * as fs from 'fs';

export async function stopCommand() {
  console.log(chalk.blue('🛑 Stopping NodeDrop platform...'));

  // Check if we're in a NodeDrop project
  if (!fs.existsSync('package.json')) {
    console.error(chalk.red('❌ No package.json found. Are you in a NodeDrop project?'));
    process.exit(1);
  }

  try {
    // Check if Docker is being used
    let useDocker = false;
    try {
      execSync('docker --version', { stdio: 'ignore' });
      // Check if docker-compose is running
      const result = execSync('docker-compose ps -q', { encoding: 'utf8' });
      if (result.trim()) {
        useDocker = true;
      }
    } catch {
      // Docker not available or not running
    }

    if (useDocker) {
      console.log(chalk.yellow('🐳 Stopping Docker containers...'));
      execSync('npm run stop', { stdio: 'inherit' });
      console.log(chalk.green('✅ Docker containers stopped'));
    } else {
      console.log(chalk.yellow('🔧 Stopping local processes...'));
      
      // Kill processes on common ports
      const ports = ['3000', '3001', '5000', '8000'];
      
      for (const port of ports) {
        try {
          if (process.platform === 'win32') {
            execSync(`netstat -ano | findstr :${port}`, { stdio: 'ignore' });
            execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /f /pid %a`, { stdio: 'ignore' });
          } else {
            execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
          }
          console.log(chalk.green(`✅ Stopped process on port ${port}`));
        } catch {
          // Process not running on this port
        }
      }
    }

    console.log(chalk.green('✅ NodeDrop platform stopped successfully'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to stop NodeDrop:'), error);
    process.exit(1);
  }
}