#!/usr/bin/env node

// Simple wrapper for the flughafen CLI with dynamic import
(async () => {
  try {
    const { main } = await import('../dist/cli/cli.mjs');
    main();
  } catch (error) {
    console.error('Failed to start CLI:', error);
    process.exit(1);
  }
})();
