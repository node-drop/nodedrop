import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const SETUP_COMPLETE_FILE = path.join(__dirname, '../../.setup-complete');

export interface SetupStatus {
  isComplete: boolean;
  hasAdmin: boolean;
  needsSetup: boolean;
  setupData?: {
    completedAt: string;
    siteName: string;
    adminEmail: string;
  };
}

/**
 * Check if initial setup is complete
 */
export async function checkSetupStatus(prisma: PrismaClient): Promise<SetupStatus> {
  // Check for setup file
  const fileExists = fs.existsSync(SETUP_COMPLETE_FILE);
  
  // Check for admin user in database
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  const hasAdmin = !!adminUser;
  const isComplete = fileExists && hasAdmin;
  const needsSetup = !isComplete;

  let setupData;
  if (fileExists) {
    try {
      const fileContent = fs.readFileSync(SETUP_COMPLETE_FILE, 'utf-8');
      setupData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to read setup file:', error);
    }
  }

  return {
    isComplete,
    hasAdmin,
    needsSetup,
    setupData,
  };
}

/**
 * Mark setup as complete
 */
export function markSetupComplete(data: {
  siteName: string;
  adminEmail: string;
}): void {
  const setupData = {
    completedAt: new Date().toISOString(),
    siteName: data.siteName,
    adminEmail: data.adminEmail,
  };

  fs.writeFileSync(SETUP_COMPLETE_FILE, JSON.stringify(setupData, null, 2));
}

/**
 * Reset setup (for development/testing)
 */
export async function resetSetup(prisma: PrismaClient): Promise<void> {
  // Remove setup file
  if (fs.existsSync(SETUP_COMPLETE_FILE)) {
    fs.unlinkSync(SETUP_COMPLETE_FILE);
  }

  // Delete admin users
  await prisma.user.deleteMany({
    where: { role: 'ADMIN' }
  });
}

/**
 * Check if setup file exists
 */
export function setupFileExists(): boolean {
  return fs.existsSync(SETUP_COMPLETE_FILE);
}
