import { pool } from './db.js';

await pool.query(`
  INSERT INTO gear_types (id, name, icon_key, is_system)
  VALUES
    ('gear_quickdraw', '快挂', 'Q', true),
    ('gear_locking_carabiner', '主锁', 'L', true),
    ('gear_cam', '机械塞', 'C', true),
    ('gear_rope', '绳索', 'R', true)
  ON CONFLICT (id) DO NOTHING
`);

console.log('seed complete');
await pool.end();
