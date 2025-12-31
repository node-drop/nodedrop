/**
 * ExecutionPauseError - Thrown by nodes that need to pause execution
 * 
 * When a node throws this error, the execution engine should:
 * 1. Save the current execution state
 * 2. Mark the execution as PAUSED
 * 3. Stop processing further nodes
 * 4. NOT treat this as a failure
 * 
 * The execution can be resumed later via webhook or scheduled job.
 */
export class ExecutionPauseError extends Error {
  public readonly waitId: string;
  public readonly waitType: 'webhook' | 'duration' | 'datetime';
  public readonly resumeAt: Date;
  public readonly resumeUrl?: string;
  public readonly outputData?: any;

  constructor(options: {
    waitId: string;
    waitType: 'webhook' | 'duration' | 'datetime';
    resumeAt: Date;
    resumeUrl?: string;
    outputData?: any;
    message?: string;
  }) {
    super(options.message || `Execution paused for ${options.waitType} wait`);
    this.name = 'ExecutionPauseError';
    this.waitId = options.waitId;
    this.waitType = options.waitType;
    this.resumeAt = options.resumeAt;
    this.resumeUrl = options.resumeUrl;
    this.outputData = options.outputData;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExecutionPauseError);
    }
  }

  /**
   * Check if an error is an ExecutionPauseError
   */
  static isExecutionPauseError(error: any): error is ExecutionPauseError {
    return error instanceof ExecutionPauseError || error?.name === 'ExecutionPauseError';
  }
}
