import { CredentialType } from "../../services/CredentialService";

/**
 * Custom AI API Credential
 * Used for connecting to Local AI services (Ollama, LocalAI) or compatible endpoints.
 */
export const CustomAIApiCredentials: CredentialType = {
	name: 'custom_ai_api',
	displayName: 'Custom AI API',
	icon: 'cpu',
    color: '#000000',
    description: 'Connect to a local or custom AI endpoint (e.g., Ollama).',
	properties: [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:11434/v1',
            placeholder: 'http://localhost:11434/v1',
            description: 'The API endpoint (including /v1 for OpenAI compatible servers)',
            required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'password',
			default: '',
            placeholder: 'sk-... (leave empty for Ollama)',
            description: 'Optional API Key for authentication',
		},
	],
    testable: false // No easy way to generic test without model name
};
