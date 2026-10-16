import app from './server.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\nPathPoint API server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Base API URL: http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/api/health\n`);
  });
} catch (error) {
  console.error(`[MongoDB] API startup stopped: ${error.message}`);
  process.exitCode = 1;
}

process.on('unhandledRejection', (error) => {
  console.error('[Unhandled Rejection]:', error);
});