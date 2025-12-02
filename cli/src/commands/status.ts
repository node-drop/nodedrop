import chalk from 'chalk';
import { execSync } from 'child_process';
import axios from 'axios';
import * as fs from 'fs';

export async function statusCommand() {
  console.log(chalk.blue('📊 Checking NodeDrop platform status...'));

  // Check if we're in a NodeDrop project
  if (!fs.existsSync('package.json')) {
    console.error(chalk.red('❌ No package.json found. Are you in a NodeDrop project?'));
    process.exit(1);
  }

  const status = {
    project: '❓ Unknown',
    docker: '❓ Unknown',
    frontend: '❓ Unknown',
    backend: '❓ Unknown',
    database: '❓ Unknown'
  };

  try {
    // Check project
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.name === 'node-drop') {
      status.project = '✅ Valid NodeDrop project';
    } else {
      status.project = '❌ Not a NodeDrop project';
    }

    // Check Docker
    try {
      execSync('docker --version', { stdio: 'ignore' });
      const result = execSync('docker-compose ps -q', { encoding: 'utf8' });
      if (result.trim()) {
        status.docker = '✅ Running';
        
        // Check individual services
        try {
          const services = execSync('docker-compose ps --services --filter "status=running"', { encoding: 'utf8' });
          const runningServices = services.trim().split('\n').filter(s => s);
          
          if (runningServices.includes('frontend')) {
            status.frontend = '✅ Running (Docker)';
          }
          if (runningServices.includes('backend')) {
            status.backend = '✅ Running (Docker)';
          }
          if (runningServices.includes('mysql') || runningServices.includes('postgres')) {
            status.database = '✅ Running (Docker)';
          }
        } catch {
          status.docker = '⚠️ Docker available but services not running';
        }
      } else {
        status.docker = '⚠️ Available but not running';
      }
    } catch {
      status.docker = '❌ Not available';
    }

    // Check services via HTTP if not running in Docker
    if (!status.frontend.includes('✅')) {
      try {
        await axios.get('http://localhost:3000', { timeout: 2000 });
        status.frontend = '✅ Running (Local)';
      } catch {
        try {
          await axios.get('http://localhost:3001', { timeout: 2000 });
          status.frontend = '✅ Running (Local - Port 3001)';
        } catch {
          status.frontend = '❌ Not running';
        }
      }
    }

    if (!status.backend.includes('✅')) {
      try {
        await axios.get('http://localhost:5000/health', { timeout: 2000 });
        status.backend = '✅ Running (Local)';
      } catch {
        try {
          await axios.get('http://localhost:8000/health', { timeout: 2000 });
          status.backend = '✅ Running (Local - Port 8000)';
        } catch {
          status.backend = '❌ Not running';
        }
      }
    }

    // Check database connection
    if (!status.database.includes('✅')) {
      try {
        // Try to connect to common database ports
        const dbPorts = ['3306', '5432', '27017']; // MySQL, PostgreSQL, MongoDB
        let dbRunning = false;
        
        for (const port of dbPorts) {
          try {
            if (process.platform === 'win32') {
              execSync(`netstat -an | findstr :${port}`, { stdio: 'ignore' });
            } else {
              execSync(`lsof -i:${port}`, { stdio: 'ignore' });
            }
            dbRunning = true;
            break;
          } catch {
            // Port not in use
          }
        }
        
        if (dbRunning) {
          status.database = '✅ Running (Local)';
        } else {
          status.database = '❌ Not running';
        }
      } catch {
        status.database = '❌ Not running';
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Error checking status:'), error);
  }

  // Display status
  console.log(chalk.white('\n📋 Platform Status:'));
  console.log(chalk.white('─'.repeat(30)));
  console.log(`Project:   ${status.project}`);
  console.log(`Docker:    ${status.docker}`);
  console.log(`Frontend:  ${status.frontend}`);
  console.log(`Backend:   ${status.backend}`);
  console.log(`Database:  ${status.database}`);
  console.log(chalk.white('─'.repeat(30)));

  // Provide recommendations
  const allRunning = Object.values(status).every(s => s.includes('✅'));
  
  if (allRunning) {
    console.log(chalk.green('\n🎉 All systems operational!'));
    console.log(chalk.blue('🌐 Access your NodeDrop platform at http://localhost:3000'));
  } else {
    console.log(chalk.yellow('\n⚠️ Some services are not running.'));
    console.log(chalk.white('💡 Try running "nodedrop start" to start the platform.'));
  }
}