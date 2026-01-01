#!/usr/bin/env node
/**
 * Script to automatically register all discovered nodes
 * Run this to register all nodes in the nodes directory without manual configuration
 */

import { NodeService } from "../services";
import { nodeDiscovery } from "../utils/NodeDiscovery";
import { logger } from "../utils/logger";

async function registerAllDiscoveredNodes() {

  const nodeService = new NodeService();

  try {
    logger.info("🔄 Auto-discovering and registering nodes...\n");

    // Auto-discover all nodes
    const nodeDefinitions = await nodeDiscovery.getAllNodeDefinitions();

    if (nodeDefinitions.length === 0) {
      logger.warn("⚠️  No nodes discovered in the nodes directory");
      return;
    }

    logger.info(`📦 Discovered ${nodeDefinitions.length} node(s):\n`);

    // List discovered nodes
    nodeDefinitions.forEach((node, index) => {
      logger.info(`   ${index + 1}. ${node.displayName} (${node.name})`);
    });

    logger.info("\n🔄 Registering nodes...\n");

    let registered = 0;
    let failed = 0;

    for (const node of nodeDefinitions) {
      try {
        const result = await nodeService.registerNode(node);

        if (result.success) {
          logger.info(`✅ Registered: ${node.displayName} (${node.name})`);
          registered++;
        } else {
          logger.error(`❌ Failed: ${node.displayName} (${node.name})`);
          result.errors?.forEach((error) => logger.error(`   ${error}`));
          failed++;
        }
      } catch (error) {
        logger.error(`❌ Error registering ${node.displayName}`, { error });
        failed++;
      }
    }

    logger.info(`\n📊 Summary:`);
    logger.info(`   Registered: ${registered}`);
    logger.info(`   Failed: ${failed}`);
    logger.info(`   Total: ${nodeDefinitions.length}`);

    // Show nodes grouped by directory
    logger.info(`\n📁 Nodes by directory:`);
    const nodesByDir = await nodeDiscovery.getNodesByDirectory();
    for (const [dirName, nodes] of Object.entries(nodesByDir)) {
      logger.info(`   ${dirName}/`);
      nodes.forEach((node) => {
        logger.info(`     └─ ${node.displayName}`);
      });
    }
  } catch (error) {
    logger.error("❌ Fatal error", { error });
    process.exit(1);
  }
}

// Run the registration
registerAllDiscoveredNodes()
  .then(async () => {
    logger.info("\n✅ Auto-registration complete");
    
    // Try to reload nodes in the running server
    try {
      logger.info("\n🔄 Reloading nodes in running server...");
      const serverUrl = process.env.BACKEND_URL || 'http://localhost:5678';
      const response = await fetch(`${serverUrl}/api/node-types/reload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        logger.info(`✅ Server registry reloaded: ${result.message}`);
      } else {
        logger.warn(`⚠️  Could not reload server registry (server may not be running): ${response.status} ${response.statusText}`);
      }
    } catch (reloadError) {
      logger.warn("⚠️  Could not reload server registry (server may not be running)");
    }
    
    process.exit(0);
  })
  .catch((error) => {
    logger.error("\n❌ Auto-registration failed", { error });
    process.exit(1);
  });
