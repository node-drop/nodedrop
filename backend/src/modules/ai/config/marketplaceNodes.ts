/**
 * Marketplace Nodes Configuration
 * 
 * Nodes that can be suggested even if not installed.
 * Externalized for easy maintenance.
 */

export interface MarketplaceNode {
  id: string;
  description: string;
}

export const MARKETPLACE_NODES: MarketplaceNode[] = [
  { id: 'slack', description: 'Send messages to Slack' },
  { id: 'discord', description: 'Post to Discord' },
  { id: 'email', description: 'Send emails via SMTP' },
  { id: 'openai', description: 'Use GPT models' },
  { id: 'github', description: 'Interact with GitHub API' },
  { id: 'google-sheets', description: 'Read/Write Google Sheets' },
  { id: 'cron', description: 'Schedule workflows' },
  { id: 'webhook', description: 'Trigger via HTTP' },
];

export function buildMarketplaceSection(): string {
  return MARKETPLACE_NODES.map(n => `- ${n.id}: ${n.description}`).join('\n');
}
