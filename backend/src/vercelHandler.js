import app from './server.js';
import connectDB from './config/db.js';

let databaseConnection;

export default async function handler(request, response) {
  try {
    if (!databaseConnection) {
      databaseConnection = connectDB().catch((error) => {
        databaseConnection = undefined;
        throw error;
      });
    }
    await databaseConnection;
    return app(request, response);
  } catch (error) {
    console.error(`[MongoDB] Serverless API request failed: ${error.message}`);
    return response.status(503).json({ success: false, message: 'API database is unavailable' });
  }
}
