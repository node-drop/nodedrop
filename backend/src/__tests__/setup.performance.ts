import { performance } from "perf_hooks";

// Performance test specific setup
beforeAll(async () => {
  // Enable performance monitoring
  global.performance = performance;

  // Set higher timeouts for performance tests
  jest.setTimeout(120000); // 2 minutes

  // Enable garbage collection if available for memory tests
  if (global.gc) {
    global.gc();
  }

  // Memory usage tracking
  (global as any).initialMemory = process.memoryUsage();

  console.log("Performance test setup complete");
  console.log(
    "Initial memory usage:",
    formatMemoryUsage((global as any).initialMemory)
  );
});

afterAll(async () => {
  // Final memory check
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage();
  const memoryGrowth =
    finalMemory.heapUsed - (global as any).initialMemory.heapUsed;

  console.log("Final memory usage:", formatMemoryUsage(finalMemory));
  console.log("Memory growth:", (memoryGrowth / 1024 / 1024).toFixed(2), "MB");

  // Warn if memory growth is excessive
  if (memoryGrowth > 100 * 1024 * 1024) {
    // 100MB
    console.warn(
      "Excessive memory growth detected:",
      (memoryGrowth / 1024 / 1024).toFixed(2),
      "MB"
    );
  }
});

// Performance test utilities
(global as any).performanceUtils = {
  measureTime: async <T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    return { result, duration: end - start };
  },

  measureMemory: <T>(
    operation: () => T
  ): { result: T; memoryDelta: number } => {
    const initialMemory = process.memoryUsage().heapUsed;
    const result = operation();
    const finalMemory = process.memoryUsage().heapUsed;
    return { result, memoryDelta: finalMemory - initialMemory };
  },

  sleep: (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

function formatMemoryUsage(memUsage: NodeJS.MemoryUsage): string {
  return Object.entries(memUsage)
    .map(([key, value]) => `${key}: ${(value / 1024 / 1024).toFixed(2)}MB`)
    .join(", ");
}

export {};
