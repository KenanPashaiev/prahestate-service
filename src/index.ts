import 'dotenv/config';
import { ApiServer } from './server';

const server = new ApiServer();

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await server.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
