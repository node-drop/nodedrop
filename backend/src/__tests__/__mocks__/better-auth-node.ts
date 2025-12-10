/**
 * Mock for better-auth/node module
 * 
 * This mock provides a minimal implementation of better-auth's Node.js handler.
 */

export const toNodeHandler = jest.fn(() => {
  return jest.fn((req: any, res: any) => {
    // Default mock handler that returns 404
    res.status(404).json({ error: "Not found" });
  });
});

export default { toNodeHandler };
