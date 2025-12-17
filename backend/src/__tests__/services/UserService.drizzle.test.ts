import { db } from '../../db/client';
import { users } from '../../db/schema/auth';
import { UserServiceDrizzle, UserFull, UserProfile } from '../../services/UserService.drizzle';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

describe('UserService with Drizzle', () => {
  let userService: UserServiceDrizzle;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    userService = new UserServiceDrizzle();
    testUserEmail = `test-user-${Date.now()}@example.com`;
  });

  afterEach(async () => {
    // Clean up test users after each test
    if (testUserId) {
      try {
        await db.delete(users).where(eq(users.id, testUserId));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('createUser', () => {
    it('should create a new user with all fields', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `create-test-${Date.now()}@example.com`,
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        role: 'admin',
        preferences: { theme: 'dark' },
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.image).toBe(userData.image);
      expect(user.role).toBe(userData.role);
      expect(user.preferences).toEqual(userData.preferences);
      expect(user.active).toBe(true);
      expect(user.banned).toBe(false);

      testUserId = userId;
    });

    it('should create a user with minimal fields', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `minimal-test-${Date.now()}@example.com`,
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.email).toBe(userData.email);
      expect(user.name).toBeNull();
      expect(user.role).toBe('user');
      expect(user.preferences).toEqual({});

      testUserId = userId;
    });
  });

  describe('getUserById', () => {
    it('should retrieve a user by ID', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `getbyid-test-${Date.now()}@example.com`,
        name: 'Get By ID Test',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const user = await userService.getUserById(userId);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe(userData.email);
      expect(user?.name).toBe(userData.name);
    });

    it('should return null for non-existent user', async () => {
      const user = await userService.getUserById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve a user by email', async () => {
      const userId = `user-${Date.now()}`;
      const email = `getbyemail-test-${Date.now()}@example.com`;
      const userData = {
        id: userId,
        email,
        name: 'Get By Email Test',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const user = await userService.getUserByEmail(email);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe(email);
      expect(user?.name).toBe(userData.name);
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.getUserByEmail('non-existent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve user profile with limited fields', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `profile-test-${Date.now()}@example.com`,
        name: 'Profile Test',
        role: 'admin',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const profile = await userService.getUserProfile(userId);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(userId);
      expect(profile?.email).toBe(userData.email);
      expect(profile?.name).toBe(userData.name);
      expect(profile?.role).toBe(userData.role);
      expect(profile?.createdAt).toBeDefined();
      expect(profile?.updatedAt).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      const profile = await userService.getUserProfile('non-existent-id');
      expect(profile).toBeNull();
    });
  });

  describe('getUserPreferences', () => {
    it('should retrieve user preferences', async () => {
      const userId = `user-${Date.now()}`;
      const preferences = { theme: 'dark', language: 'en' };
      const userData = {
        id: userId,
        email: `prefs-test-${Date.now()}@example.com`,
        preferences,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const result = await userService.getUserPreferences(userId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userId);
      expect(result?.preferences).toEqual(preferences);
    });

    it('should return empty preferences if not set', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `empty-prefs-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const result = await userService.getUserPreferences(userId);

      expect(result).toBeDefined();
      expect(result?.preferences).toEqual({});
    });
  });

  describe('updateUserProfile', () => {
    it('should update user name and email', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `update-test-${Date.now()}@example.com`,
        name: 'Original Name',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newEmail = `updated-${Date.now()}@example.com`;
      const newName = 'Updated Name';

      const updated = await userService.updateUserProfile(userId, {
        email: newEmail,
        name: newName,
      });

      expect(updated).toBeDefined();
      expect(updated?.email).toBe(newEmail);
      expect(updated?.name).toBe(newName);
    });

    it('should update only name', async () => {
      const userId = `user-${Date.now()}`;
      const email = `partial-update-${Date.now()}@example.com`;
      const userData = {
        id: userId,
        email,
        name: 'Original Name',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newName = 'New Name';
      const updated = await userService.updateUserProfile(userId, {
        name: newName,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe(newName);
      expect(updated?.email).toBe(email);
    });

    it('should return null for non-existent user', async () => {
      const updated = await userService.updateUserProfile('non-existent-id', {
        name: 'New Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `prefs-update-${Date.now()}@example.com`,
        preferences: { theme: 'light' },
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newPreferences = { theme: 'dark', language: 'fr' };
      const updated = await userService.updateUserPreferences(userId, newPreferences);

      expect(updated).toBeDefined();
      expect(updated?.preferences).toEqual(newPreferences);
    });

    it('should replace entire preferences object', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `prefs-replace-${Date.now()}@example.com`,
        preferences: { theme: 'light', language: 'en', notifications: true },
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newPreferences = { theme: 'dark' };
      const updated = await userService.updateUserPreferences(userId, newPreferences);

      expect(updated).toBeDefined();
      expect(updated?.preferences).toEqual(newPreferences);
    });
  });

  describe('mergeUserPreferences', () => {
    it('should merge preferences with existing ones', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `merge-prefs-${Date.now()}@example.com`,
        preferences: { theme: 'light', language: 'en' },
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newPreferences = { theme: 'dark' };
      const merged = await userService.mergeUserPreferences(userId, newPreferences);

      expect(merged).toBeDefined();
      expect(merged?.preferences?.theme).toBe('dark');
      expect(merged?.preferences?.language).toBe('en');
    });

    it('should deep merge canvas settings', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `canvas-merge-${Date.now()}@example.com`,
        preferences: {
          canvas: { zoom: 1, panX: 0, panY: 0 },
        },
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newPreferences = { canvas: { zoom: 2 } };
      const merged = await userService.mergeUserPreferences(userId, newPreferences);

      expect(merged).toBeDefined();
      expect(merged?.preferences?.canvas?.zoom).toBe(2);
      expect(merged?.preferences?.canvas?.panX).toBe(0);
      expect(merged?.preferences?.canvas?.panY).toBe(0);
    });

    it('should replace pinnedNodes array', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `pinned-merge-${Date.now()}@example.com`,
        preferences: { pinnedNodes: ['node1', 'node2'] },
      };

      await userService.createUser(userData);
      testUserId = userId;

      const newPreferences = { pinnedNodes: ['node3', 'node4', 'node5'] };
      const merged = await userService.mergeUserPreferences(userId, newPreferences);

      expect(merged).toBeDefined();
      expect(merged?.preferences?.pinnedNodes).toEqual(['node3', 'node4', 'node5']);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `role-update-${Date.now()}@example.com`,
        role: 'user',
      };

      await userService.createUser(userData);
      testUserId = userId;

      const updated = await userService.updateUserRole(userId, 'admin');

      expect(updated).toBeDefined();
      expect(updated?.role).toBe('admin');
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `ban-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const banned = await userService.banUser(userId, 'Spam', new Date('2025-12-31'));

      expect(banned).toBeDefined();
      expect(banned?.banned).toBe(true);
      expect(banned?.banReason).toBe('Spam');
      expect(banned?.banExpires).toBeDefined();
    });

    it('should ban a user without reason', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `ban-no-reason-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const banned = await userService.banUser(userId);

      expect(banned).toBeDefined();
      expect(banned?.banned).toBe(true);
      expect(banned?.banReason).toBeNull();
    });
  });

  describe('unbanUser', () => {
    it('should unban a user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `unban-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      await userService.banUser(userId, 'Test ban');
      const unbanned = await userService.unbanUser(userId);

      expect(unbanned).toBeDefined();
      expect(unbanned?.banned).toBe(false);
      expect(unbanned?.banReason).toBeNull();
      expect(unbanned?.banExpires).toBeNull();
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate a user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `deactivate-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const deactivated = await userService.deactivateUser(userId);

      expect(deactivated).toBeDefined();
      expect(deactivated?.active).toBe(false);
    });
  });

  describe('activateUser', () => {
    it('should activate a user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `activate-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      await userService.deactivateUser(userId);
      const activated = await userService.activateUser(userId);

      expect(activated).toBeDefined();
      expect(activated?.active).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `delete-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);

      const deleted = await userService.deleteUser(userId);

      expect(deleted).toBe(true);

      const user = await userService.getUserById(userId);
      expect(user).toBeNull();
    });

    it('should return false when deleting non-existent user', async () => {
      const deleted = await userService.deleteUser('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true for existing email', async () => {
      const userId = `user-${Date.now()}`;
      const email = `exists-test-${Date.now()}@example.com`;
      const userData = {
        id: userId,
        email,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const exists = await userService.userExistsByEmail(email);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await userService.userExistsByEmail('non-existent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('userExistsById', () => {
    it('should return true for existing user ID', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `exists-id-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const exists = await userService.userExistsById(userId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent user ID', async () => {
      const exists = await userService.userExistsById('non-existent-id');
      expect(exists).toBe(false);
    });
  });

  describe('updateEmailVerificationStatus', () => {
    it('should mark email as verified', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `verify-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const updated = await userService.updateEmailVerificationStatus(userId, true);

      expect(updated).toBeDefined();
      expect(updated?.emailVerified).toBe(true);
    });

    it('should mark email as unverified', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `unverify-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      await userService.updateEmailVerificationStatus(userId, true);
      const updated = await userService.updateEmailVerificationStatus(userId, false);

      expect(updated).toBeDefined();
      expect(updated?.emailVerified).toBe(false);
    });
  });

  describe('setDefaultWorkspace', () => {
    it('should set default workspace for user', async () => {
      const userId = `user-${Date.now()}`;
      const userData = {
        id: userId,
        email: `workspace-test-${Date.now()}@example.com`,
      };

      await userService.createUser(userData);
      testUserId = userId;

      const workspaceId = `workspace-${Date.now()}`;
      const updated = await userService.setDefaultWorkspace(userId, workspaceId);

      expect(updated).toBeDefined();
      expect(updated?.defaultWorkspaceId).toBe(workspaceId);
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users', async () => {
      const userId1 = `user-${Date.now()}-1`;
      const userId2 = `user-${Date.now()}-2`;

      await userService.createUser({
        id: userId1,
        email: `all-users-test-1-${Date.now()}@example.com`,
      });

      await userService.createUser({
        id: userId2,
        email: `all-users-test-2-${Date.now()}@example.com`,
      });

      testUserId = userId1;

      const users = await userService.getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(2);

      // Clean up second user
      await db.delete(users).where(eq(users.id, userId2));
    });

    it('should retrieve users with limit and offset', async () => {
      const userId1 = `user-${Date.now()}-1`;
      const userId2 = `user-${Date.now()}-2`;

      await userService.createUser({
        id: userId1,
        email: `limit-test-1-${Date.now()}@example.com`,
      });

      await userService.createUser({
        id: userId2,
        email: `limit-test-2-${Date.now()}@example.com`,
      });

      testUserId = userId1;

      const result = await userService.getAllUsers({ limit: 1, offset: 0 });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(1);

      // Clean up second user
      await db.delete(users).where(eq(users.id, userId2));
    });
  });
});
