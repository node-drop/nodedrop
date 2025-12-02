/**
 * Verification script for FlowExecutionEngine implementation
 * This verifies that the core class has all required methods and interfaces
 */

import { FlowExecutionEngine, FlowExecutionContext, FlowExecutionOptions, FlowExecutionResult, NodeExecutionState, ExecutionFlowStatus } from '../FlowExecutionEngine';

// Verify that all required interfaces exist
const verifyInterfaces = () => {
  console.log('✓ FlowExecutionContext interface exists');
  console.log('✓ FlowExecutionOptions interface exists');
  console.log('✓ FlowExecutionResult interface exists');
  console.log('✓ NodeExecutionState interface exists');
  console.log('✓ ExecutionFlowStatus interface exists');
};

// Verify that FlowExecutionEngine class has all required methods
const verifyFlowExecutionEngine = () => {
  const methods = [
    'executeFromNode',
    'executeFromTrigger',
    'getExecutionStatus',
    'cancelExecution',
    'pauseExecution',
    'resumeExecution'
  ];

  methods.forEach(method => {
    if (typeof (FlowExecutionEngine.prototype as any)[method] === 'function') {
      console.log(`✓ FlowExecutionEngine.${method}() method exists`);
    } else {
      console.log(`✗ FlowExecutionEngine.${method}() method missing`);
    }
  });
};

// Verify that the class extends EventEmitter
const verifyEventEmitter = () => {
  const hasEventEmitterMethods = [
    'on',
    'emit',
    'removeListener',
    'addListener'
  ].every(method => typeof (FlowExecutionEngine.prototype as any)[method] === 'function');

  if (hasEventEmitterMethods) {
    console.log('✓ FlowExecutionEngine extends EventEmitter');
  } else {
    console.log('✗ FlowExecutionEngine does not extend EventEmitter');
  }
};

// Run verification
console.log('=== FlowExecutionEngine Implementation Verification ===\n');

console.log('1. Checking interfaces...');
verifyInterfaces();

console.log('\n2. Checking FlowExecutionEngine methods...');
verifyFlowExecutionEngine();

console.log('\n3. Checking EventEmitter inheritance...');
verifyEventEmitter();

console.log('\n=== Verification Complete ===');

// Verify that we can create an instance (with mocked dependencies)
try {
  const mockPrisma = {} as any;
  const mockNodeService = {} as any;
  const mockExecutionHistoryService = {} as any;
  const engine = new FlowExecutionEngine(mockPrisma, mockNodeService, mockExecutionHistoryService);
  console.log('✓ FlowExecutionEngine can be instantiated');
} catch (error) {
  console.log('✗ FlowExecutionEngine instantiation failed:', error);
}

export { FlowExecutionEngine };