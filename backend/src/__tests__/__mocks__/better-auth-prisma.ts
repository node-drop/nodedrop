/**
 * Mock for better-auth/adapters/prisma module
 * 
 * This mock provides a minimal implementation of better-auth's Prisma adapter.
 */

export const prismaAdapter = jest.fn((prisma: any, options?: any) => ({
  prisma,
  options,
  findMany: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
}));

export default { prismaAdapter };
