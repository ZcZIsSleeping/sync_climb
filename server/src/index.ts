import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT ?? 8787);

const server = app.listen(port, () => {
  console.log(`syn-climb server listening on http://localhost:${port}`);
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
