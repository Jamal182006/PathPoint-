import mongoose from 'mongoose';
import app from './server.js';
import connectDB from './config/db.js';

let databaseConnection;

const openConnection = () => {
  databaseConnection = connectDB().catch((error) => {
    databaseConnection = undefined;
    throw error;
  });
  return databaseConnection;
};

// On serverless platforms the module scope (and therefore the cached
// connection promise) can survive while the underlying MongoDB socket is
// closed by the platform during idle periods. In that window the cached
// promise is still resolved, so naively awaiting it lets requests run against
// a dead connection -- which is why /api/health could report "disconnected"
// while other routes happened to reconnect. Always confirm the driver is
// actually connected before letting a request through.
const ensureDatabase = async () => {
  if (mongoose.connection.readyState === 1) return;

  if (mongoose.connection.readyState === 2) {
    try {
      await mongoose.connection.asPromise();
      if (mongoose.connection.readyState === 1) return;
    } catch {
      // Fall through to an explicit reconnect attempt below.
    }
  }

  if (!databaseConnection) {
    openConnection();
  }

  try {
    await databaseConnection;
  } catch (error) {
    databaseConnection = undefined;
    throw error;
  }

  if (mongoose.connection.readyState !== 1) {
    databaseConnection = undefined;
    openConnection();
    await databaseConnection;
  }
};

export default async function handler(request, response) {
  try {
    await ensureDatabase();
    return app(request, response);
  } catch (error) {
    console.error(`[MongoDB] Serverless API request failed: ${error.message}`);
    return response.status(503).json({ success: false, message: 'API database is unavailable' });
  }
}
