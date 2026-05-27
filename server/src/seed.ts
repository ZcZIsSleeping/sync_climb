import { pool } from './db.js';

await pool.query(`
  INSERT INTO gear_types (id, name, icon_key, is_system)
  VALUES
    ('gear_quickdraw', '快挂', 'Q', true),
    ('gear_locking_carabiner', '主锁', 'L', true),
    ('gear_cam', '机械塞', 'C', true),
    ('gear_rope', '绳索', 'R', true),
    ('gear_nuts', '岩塞', 'N', true),
    ('gear_sling', '扁带', 'S', true),
    ('gear_tent', '帐篷', 'T', true)
  ON CONFLICT (id) DO NOTHING
`);

console.log('seed complete');
await pool.end();
