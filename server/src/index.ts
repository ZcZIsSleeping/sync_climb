import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';

const server = app.listen(port, host, () => {
  console.log(`syn-climb server listening on http://${host}:${port}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
