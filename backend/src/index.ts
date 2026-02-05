import 'reflect-metadata';
import { config } from 'dotenv';
import { AppDataSource } from './database/data-source';
import { createApp } from './app';

config();

const app = createApp();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? 'localhost';

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established successfully');

    // Start server
    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);
      console.log(`Health check endpoint: http://${HOST}:${PORT}/health`);
    });
  })
  .catch((error: unknown) => {
    console.error('Error during database initialization:', error);
    process.exit(1);
  });
