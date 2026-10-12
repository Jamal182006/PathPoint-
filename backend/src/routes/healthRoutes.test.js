import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import healthRoutes from './healthRoutes.js';

test('health endpoint reports unavailable when MongoDB is disconnected', async () => {
  const previousConnectionState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;

  const app = express();
  app.use(healthRoutes);
  const server = app.listen(0);
  after(() => {
    mongoose.connection.readyState = previousConnectionState;
    server.close();
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.status, 'unavailable');
  assert.equal(body.database, 'disconnected');
});