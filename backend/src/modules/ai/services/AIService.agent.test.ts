
import OpenAI from 'openai';
import { AIService } from './AIService';

// Mock OpenAI
jest.mock('openai');

describe('AIService Agentic Loop', () => {
    let aiService: AIService;
    let mockNodeService: any;
    let mockOpenAI: any;

    beforeEach(() => {
        mockNodeService = {
            getNodeTypes: jest.fn().mockResolvedValue([]),
        };
        
        mockOpenAI = {
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        };

        (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAI);
        
        // Mock the embedding service import if possible, or just mock the method if it's dynamic
        // Since it's a dynamic import in the code, we might need to rely on the fallback path (LLM selection)
        // or just mock the whole import. For simplicity, we'll assume the code handles the import.
    });

    it('should loop when get_latest_execution_logs is called', async () => {
        aiService = new AIService(mockNodeService);
        
        // Mock Tool Call 1: get_latest_execution_logs
        const toolCallMsg = {
            message: {
                role: 'assistant',
                tool_calls: [{
                    id: 'call_1',
                    type: 'function',
                    function: { 
                        name: 'get_latest_execution_logs',
                        arguments: '{}'
                    }
                }]
            }
        };

        // Mock Tool Call 2: Final advise_user
        const finalMsg = {
            message: {
                role: 'assistant',
                content: 'Here is the advice.',
                tool_calls: [{
                    id: 'call_2',
                    type: 'function',
                    function: { 
                        name: 'advise_user',
                        arguments: '{"message": "Based on the logs, it failed due to Auth."}'
                    }
                }]
            }
        };

        mockOpenAI.chat.completions.create
            .mockResolvedValueOnce({ choices: [toolCallMsg] }) // First turn
            .mockResolvedValueOnce({ choices: [finalMsg] });   // Second turn

        const result = await aiService.generateWorkflow({
            prompt: "Why did it fail?",
            executionContext: {
                lastRunStatus: 'error',
                errors: [{ nodeId: 'n1', error: 'Auth failed' }],
                logs: ['Step 1 ok', 'Step 2 failed']
            }
        });

        expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
        
        // Verify second call included the tool result
        const secondCallArgs = mockOpenAI.chat.completions.create.mock.calls[1][0];
        const messages = secondCallArgs.messages;
        expect(messages).toHaveLength(4); // System, User, ToolCall, ToolResult
        
        const toolResult = messages[3];
        expect(toolResult.role).toBe('tool');
        expect(toolResult.name).toBe('get_latest_execution_logs');
        expect(toolResult.content).toContain('Auth failed');
        
        expect(result.message).toContain('Based on the logs');
    });
});
