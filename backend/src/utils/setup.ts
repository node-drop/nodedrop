import fs from 'fs';
import path from 'path';
import { userServiceDrizzle } from '../services/UserService.drizzle';
import { db } from '../db/client';
import { users } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

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
 * 
 * Setup is considered complete if an admin user exists in the database.
 * The .setup-complete file is optional metadata for tracking when setup occurred.
 */
export async function checkSetupStatus(): Promise<SetupStatus> {
  // Check for setup file
  const fileExists = fs.existsSync(SETUP_COMPLETE_FILE);
  
  // Check for admin user in database using Drizzle
  const adminUser = await userServiceDrizzle.getFirstUserByRole('admin');

  const hasAdmin = !!adminUser;
  // Setup is complete if we have an admin user (file is optional metadata)
  const isComplete = hasAdmin;
  const needsSetup = !hasAdmin;

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
export async function resetSetup(): Promise<void> {
  // Remove setup file
  if (fs.existsSync(SETUP_COMPLETE_FILE)) {
    fs.unlinkSync(SETUP_COMPLETE_FILE);
  }

  // Delete admin users using Drizzle
  await db.delete(users).where(eq(users.role, 'admin'));
}

/**
 * Check if setup file exists
 */
export function setupFileExists(): boolean {
  return fs.existsSync(SETUP_COMPLETE_FILE);
}
