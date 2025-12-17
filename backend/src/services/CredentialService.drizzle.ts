import * as crypto from 'crypto';
import { eq, and, or, desc, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { credentials, credentialShares } from '../db/schema/credentials';
import { users } from '../db/schema/auth';
import { teams } from '../db/schema/teams';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface WorkspaceQueryOptions {
  workspaceId?: string;
}

export interface CredentialData {
  [key: string]: any;
}

export interface CredentialType {
  name: string;
  displayName: string;
  description?: string;
  properties: CredentialProperty[];
  icon?: string;
  color?: string;
  testable?: boolean;
  oauthProvider?: string;
  test?: (data: CredentialData) => Promise<{ success: boolean; message: string }>;
}

export interface CredentialProperty {
  displayName: string;
  name: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'options' | 'hidden';
  required?: boolean;
  readonly?: boolean;
  default?: any;
  description?: string;
  options?: Array<{ name: string; value: any }>;
  placeholder?: string;
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface CredentialWithData {
  id: string;
  name: string;
  type: string;
  userId: string;
  data: CredentialData;
  expiresAt?: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class CredentialServiceDrizzle {
  private encryptionKey: string;
  private algorithm = 'aes-256-cbc';
  private credentialTypeRegistry = new Map<string, CredentialType>();
  private coreCredentialsRegistered = false;

  constructor() {
    const keyString = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!keyString || keyString.length !== 64) {
      throw new Error(
        'CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
      );
    }
    this.encryptionKey = keyString;
  }

  registerCoreCredentials(): void {
    if (this.coreCredentialsRegistered) {
      logger.info('Core credentials already registered, skipping');
      return;
    }

    try {
      const { CoreCredentials } = require('../oauth/credentials');
      for (const credential of CoreCredentials) {
        this.registerCredentialType(credential);
      }
      this.coreCredentialsRegistered = true;
    } catch (error) {
      logger.error('Failed to register core credentials:', error);
      throw error;
    }
  }

  registerCredentialType(credentialType: CredentialType): void {
    this.credentialTypeRegistry.set(credentialType.name, credentialType);
  }

  unregisterCredentialType(credentialTypeName: string): void {
    this.credentialTypeRegistry.delete(credentialTypeName);
  }

  private encryptData(data: CredentialData): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex');
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const combined = iv.toString('hex') + ':' + encrypted;
      return combined;
    } catch (error) {
      logger.error('Failed to encrypt credential data:', error);
      throw new AppError('Failed to encrypt credential data', 500);
    }
  }

  private decryptData(encryptedData: string): CredentialData {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = Buffer.from(this.encryptionKey, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt credential data:', error);
      throw new AppError('Failed to decrypt credential data', 500);
    }
  }

  async createCredential(
    userId: string,
    name: string,
    type: string,
    data: CredentialData,
    expiresAt?: Date,
    options?: WorkspaceQueryOptions
  ): Promise<CredentialWithData> {
    const credentialType = this.getCredentialType(type);
    if (!credentialType) {
      throw new AppError(`Unknown credential type: ${type}`, 400);
    }

    this.validateCredentialData(credentialType, data);

    const whereConditions = [eq(credentials.userId, userId), eq(credentials.name, name)];
    if (options?.workspaceId) {
      whereConditions.push(eq(credentials.workspaceId, options.workspaceId));
    }

    const existingCredential = await db.query.credentials.findFirst({
      where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
    });

    if (existingCredential) {
      throw new AppError('A credential with this name already exists', 400);
    }

    const encryptedData = this.encryptData(data);

    const [newCredential] = await db
      .insert(credentials)
      .values({
        name,
        type,
        userId,
        workspaceId: options?.workspaceId,
        data: encryptedData,
        expiresAt,
      })
      .returning();

    logger.info(`Credential created: ${name} (${type}) for user ${userId}`);

    return {
      ...newCredential,
      data,
    };
  }

  async getCredential(id: string, userId: string): Promise<CredentialWithData | null> {
    let credential = await db.query.credentials.findFirst({
      where: and(eq(credentials.id, id), eq(credentials.userId, userId)),
    });

    let isOwner = !!credential;
    let permission = 'EDIT';

    if (!credential) {
      const share = await db.query.credentialShares.findFirst({
        where: and(
          eq(credentialShares.credentialId, id),
          eq(credentialShares.sharedWithUserId, userId)
        ),
        with: {
          credential: true,
        },
      });

      if (share) {
        credential = share.credential;
        permission = share.permission;
      }
    }

    if (!credential) {
      return null;
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new AppError('Credential has expired', 401);
    }

    const decryptedData = this.decryptData(credential.data);

    return {
      ...credential,
      data: decryptedData,
      isOwner,
      permission,
    } as any;
  }

  async getCredentialById(id: string): Promise<CredentialWithData | null> {
    const credential = await db.query.credentials.findFirst({
      where: eq(credentials.id, id),
    });

    if (!credential) {
      return null;
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      throw new AppError('Credential has expired', 401);
    }

    const decryptedData = this.decryptData(credential.data);

    return {
      ...credential,
      data: decryptedData,
    };
  }

  async getCredentials(userId: string, type?: string, options?: WorkspaceQueryOptions) {
    const typeFilter = type ? eq(credentials.type, type) : undefined;
    const workspaceFilter = options?.workspaceId ? eq(credentials.workspaceId, options.workspaceId) : undefined;

    const whereConditions = [eq(credentials.userId, userId)];
    if (typeFilter) whereConditions.push(typeFilter);
    if (workspaceFilter) whereConditions.push(workspaceFilter);

    const ownCredentials = await db.query.credentials.findMany({
      where: whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0],
      columns: {
        id: true,
        name: true,
        type: true,
        userId: true,
        workspaceId: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const userShares = await db.query.credentialShares.findMany({
      where: eq(credentialShares.sharedWithUserId, userId),
      with: {
        credential: {
          columns: {
            id: true,
            name: true,
            type: true,
            userId: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const credentialMap = new Map();

    ownCredentials.forEach((cred) => {
      credentialMap.set(cred.id, {
        ...cred,
        isOwner: true,
        permission: 'EDIT',
      });
    });

    userShares.forEach((share) => {
      const cred = share.credential;
      if (type && cred.type !== type) return;

      if (!credentialMap.has(cred.id)) {
        credentialMap.set(cred.id, {
          ...cred,
          isOwner: false,
          permission: share.permission,
          sharedBy: share.owner,
          sharedVia: 'user',
        });
      }
    });

    return Array.from(credentialMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  async updateCredential(
    id: string,
    userId: string,
    updates: {
      name?: string;
      data?: CredentialData;
      expiresAt?: Date;
    }
  ): Promise<CredentialWithData> {
    const existingCredential = await db.query.credentials.findFirst({
      where: and(eq(credentials.id, id), eq(credentials.userId, userId)),
    });

    if (!existingCredential) {
      throw new AppError('Credential not found', 404);
    }

    if (updates.name && updates.name !== existingCredential.name) {
      const nameConflict = await db.query.credentials.findFirst({
        where: and(
          eq(credentials.userId, userId),
          eq(credentials.name, updates.name)
        ),
      });

      if (nameConflict) {
        throw new AppError('A credential with this name already exists', 400);
      }
    }

    const updateData: any = {};

    if (updates.name) {
      updateData.name = updates.name;
    }

    if (updates.data) {
      const credentialType = this.getCredentialType(existingCredential.type);
      if (credentialType) {
        this.validateCredentialData(credentialType, updates.data);
      }
      updateData.data = this.encryptData(updates.data);
    }

    if (updates.expiresAt !== undefined) {
      updateData.expiresAt = updates.expiresAt;
    }

    const [updatedCredential] = await db
      .update(credentials)
      .set(updateData)
      .where(eq(credentials.id, id))
      .returning();

    logger.info(
      `Credential updated: ${updatedCredential.name} (${updatedCredential.type}) for user ${userId}`
    );

    const decryptedData = updates.data || this.decryptData(updatedCredential.data);

    return {
      ...updatedCredential,
      data: decryptedData,
    };
  }

  async deleteCredential(id: string, userId: string): Promise<void> {
    const credential = await db.query.credentials.findFirst({
      where: and(eq(credentials.id, id), eq(credentials.userId, userId)),
    });

    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    await db.delete(credentials).where(eq(credentials.id, id));

    logger.info(
      `Credential deleted: ${credential.name} (${credential.type}) for user ${userId}`
    );
  }

  async getCredentialForExecution(
    credentialId: string,
    userId: string
  ): Promise<CredentialData> {
    const credential = await this.getCredential(credentialId, userId);

    if (!credential) {
      throw new AppError('Credential not found', 404);
    }

    return credential.data;
  }

  async testCredential(
    type: string,
    data: CredentialData
  ): Promise<{ success: boolean; message: string }> {
    const credentialType = this.getCredentialType(type);
    if (!credentialType) {
      return { success: false, message: `Unknown credential type: ${type}` };
    }

    try {
      this.validateCredentialData(credentialType, data);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    if (credentialType.test && typeof credentialType.test === 'function') {
      try {
        return await credentialType.test(data);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Test failed',
        };
      }
    }

    return { success: true, message: 'Credential format is valid' };
  }

  async getExpiringCredentials(userId: string, warningDays: number = 7) {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    return await db.query.credentials.findMany({
      where: and(
        eq(credentials.userId, userId),
        lt(credentials.expiresAt, warningDate)
      ),
      columns: {
        id: true,
        name: true,
        type: true,
        expiresAt: true,
      },
    });
  }

  async rotateCredential(
    id: string,
    userId: string,
    newData: CredentialData
  ): Promise<CredentialWithData> {
    const existingCredential = await db.query.credentials.findFirst({
      where: and(eq(credentials.id, id), eq(credentials.userId, userId)),
    });

    if (!existingCredential) {
      throw new AppError('Credential not found', 404);
    }

    const credentialType = this.getCredentialType(existingCredential.type);
    if (credentialType) {
      this.validateCredentialData(credentialType, newData);
    }

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 90);

    const updatedCredential = await this.updateCredential(id, userId, {
      data: newData,
      expiresAt: newExpiresAt,
    });

    logger.info(
      `Credential rotated: ${existingCredential.name} (${existingCredential.type}) for user ${userId}`
    );

    return updatedCredential;
  }

  getCredentialTypes(): CredentialType[] {
    return Array.from(this.credentialTypeRegistry.values());
  }

  getCredentialType(type: string): CredentialType | null {
    return this.credentialTypeRegistry.get(type) || null;
  }

  private shouldShowProperty(
    property: any,
    data: CredentialData,
    allProperties: any[]
  ): boolean {
    const displayOptions = property.displayOptions;

    if (!displayOptions) {
      return true;
    }

    if (displayOptions.show) {
      const shouldShow = Object.entries(displayOptions.show).every(
        ([dependentFieldName, expectedValues]: [string, any]) => {
          let currentValue = data[dependentFieldName];

          if (currentValue === undefined) {
            const dependentProperty = allProperties.find(
              (p) => p.name === dependentFieldName
            );
            currentValue = dependentProperty?.default;
          }

          return (
            currentValue !== undefined &&
            (expectedValues as any[]).includes(currentValue)
          );
        }
      );

      if (!shouldShow) {
        return false;
      }
    }

    if (displayOptions.hide) {
      const shouldHide = Object.entries(displayOptions.hide).some(
        ([dependentFieldName, expectedValues]: [string, any]) => {
          let currentValue = data[dependentFieldName];

          if (currentValue === undefined) {
            const dependentProperty = allProperties.find(
              (p) => p.name === dependentFieldName
            );
            currentValue = dependentProperty?.default;
          }

          return (
            currentValue !== undefined &&
            (expectedValues as any[]).includes(currentValue)
          );
        }
      );

      if (shouldHide) {
        return false;
      }
    }

    return true;
  }

  private validateCredentialData(
    credentialType: CredentialType,
    data: CredentialData
  ): void {
    const errors: string[] = [];

    for (const property of credentialType.properties) {
      if (!this.shouldShowProperty(property, data, credentialType.properties)) {
        continue;
      }

      const value = data[property.name];

      if (
        property.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push(`${property.displayName} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        switch (property.type) {
          case 'string':
          case 'password':
            if (typeof value !== 'string') {
              errors.push(`${property.displayName} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              errors.push(`${property.displayName} must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`${property.displayName} must be a boolean`);
            }
            break;
          case 'options':
            if (
              property.options &&
              !property.options.some((opt) => opt.value === value)
            ) {
              errors.push(
                `${property.displayName} must be one of the allowed options`
              );
            }
            break;
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        `Credential validation failed: ${errors.join(', ')}`,
        400
      );
    }
  }

  async shareCredential(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string,
    permission: 'USE' | 'VIEW' | 'EDIT' = 'USE',
    sharedByUserId?: string
  ): Promise<any> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    if (ownerUserId === shareWithUserId) {
      throw new AppError('Cannot share credential with yourself', 400);
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, shareWithUserId),
    });

    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    const existingShare = await db.query.credentialShares.findFirst({
      where: and(
        eq(credentialShares.credentialId, credentialId),
        eq(credentialShares.sharedWithUserId, shareWithUserId)
      ),
    });

    if (existingShare) {
      throw new AppError('Credential already shared with this user', 400);
    }

    const [share] = await db
      .insert(credentialShares)
      .values({
        credentialId,
        ownerUserId,
        sharedWithUserId: shareWithUserId,
        sharedWithTeamId: null,
        permission,
        sharedByUserId: sharedByUserId || ownerUserId,
      })
      .returning();

    logger.info(
      `Credential shared: ${credentialId} with user ${shareWithUserId} (permission: ${permission})`
    );

    const result = await db.query.credentialShares.findFirst({
      where: eq(credentialShares.id, share.id),
      with: {
        sharedWithUser: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
        credential: {
          columns: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return result;
  }

  async shareCredentialWithTeam(
    credentialId: string,
    ownerUserId: string,
    teamId: string,
    permission: 'USE' | 'VIEW' | 'EDIT' = 'USE',
    sharedByUserId?: string
  ): Promise<any> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const existingShare = await db.query.credentialShares.findFirst({
      where: and(
        eq(credentialShares.credentialId, credentialId),
        eq(credentialShares.sharedWithTeamId, teamId)
      ),
    });

    if (existingShare) {
      throw new AppError('Credential already shared with this team', 400);
    }

    const [share] = await db
      .insert(credentialShares)
      .values({
        credentialId,
        ownerUserId,
        sharedWithUserId: null,
        sharedWithTeamId: teamId,
        permission,
        sharedByUserId: sharedByUserId || ownerUserId,
      })
      .returning();

    logger.info(
      `Credential shared: ${credentialId} with team ${teamId} (permission: ${permission})`
    );

    const result = await db.query.credentialShares.findFirst({
      where: eq(credentialShares.id, share.id),
      with: {
        sharedWithTeam: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        credential: {
          columns: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return result;
  }

  async unshareCredential(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string
  ): Promise<void> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const result = await db
      .delete(credentialShares)
      .where(
        and(
          eq(credentialShares.credentialId, credentialId),
          eq(credentialShares.sharedWithUserId, shareWithUserId)
        )
      );

    if (result.rowCount === 0) {
      throw new AppError('Share not found', 404);
    }

    logger.info(
      `Credential unshared: ${credentialId} from user ${shareWithUserId}`
    );
  }

  async unshareCredentialFromTeam(
    credentialId: string,
    ownerUserId: string,
    teamId: string
  ): Promise<void> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const result = await db
      .delete(credentialShares)
      .where(
        and(
          eq(credentialShares.credentialId, credentialId),
          eq(credentialShares.sharedWithTeamId, teamId)
        )
      );

    if (result.rowCount === 0) {
      throw new AppError('Share not found', 404);
    }

    logger.info(
      `Credential unshared: ${credentialId} from team ${teamId}`
    );
  }

  async getCredentialShares(
    credentialId: string,
    ownerUserId: string
  ): Promise<any[]> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const shares = await db.query.credentialShares.findMany({
      where: eq(credentialShares.credentialId, credentialId),
      with: {
        sharedWithUser: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
        sharedWithTeam: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
      orderBy: desc(credentialShares.sharedAt),
    });

    return shares.map((share) => ({
      ...share,
      shareType: share.sharedWithUserId ? 'user' : 'team',
      sharedWith: share.sharedWithUserId ? share.sharedWithUser : share.sharedWithTeam,
    }));
  }

  async updateSharePermission(
    credentialId: string,
    ownerUserId: string,
    shareWithUserId: string,
    newPermission: 'USE' | 'VIEW' | 'EDIT'
  ): Promise<any> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const result = await db
      .update(credentialShares)
      .set({ permission: newPermission })
      .where(
        and(
          eq(credentialShares.credentialId, credentialId),
          eq(credentialShares.sharedWithUserId, shareWithUserId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new AppError('Share not found', 404);
    }

    logger.info(
      `Share permission updated: ${credentialId} for user ${shareWithUserId} to ${newPermission}`
    );

    return await db.query.credentialShares.findFirst({
      where: and(
        eq(credentialShares.credentialId, credentialId),
        eq(credentialShares.sharedWithUserId, shareWithUserId)
      ),
      with: {
        sharedWithUser: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async updateTeamSharePermission(
    credentialId: string,
    ownerUserId: string,
    teamId: string,
    newPermission: 'USE' | 'VIEW' | 'EDIT'
  ): Promise<any> {
    const credential = await this.getCredential(credentialId, ownerUserId);
    if (!credential) {
      throw new AppError('Credential not found or access denied', 404);
    }

    const result = await db
      .update(credentialShares)
      .set({ permission: newPermission })
      .where(
        and(
          eq(credentialShares.credentialId, credentialId),
          eq(credentialShares.sharedWithTeamId, teamId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new AppError('Share not found', 404);
    }

    logger.info(
      `Team share permission updated: ${credentialId} for team ${teamId} to ${newPermission}`
    );

    return await db.query.credentialShares.findFirst({
      where: and(
        eq(credentialShares.credentialId, credentialId),
        eq(credentialShares.sharedWithTeamId, teamId)
      ),
      with: {
        sharedWithTeam: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });
  }

  async getSharedCredentials(userId: string): Promise<any[]> {
    const shares = await db.query.credentialShares.findMany({
      where: eq(credentialShares.sharedWithUserId, userId),
      with: {
        credential: {
          columns: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            updatedAt: true,
            expiresAt: true,
          },
        },
        owner: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: desc(credentialShares.sharedAt),
    });

    return shares.map((share) => ({
      ...share.credential,
      sharedBy: share.owner,
      permission: share.permission,
      sharedAt: share.sharedAt,
      isShared: true,
    }));
  }
}
