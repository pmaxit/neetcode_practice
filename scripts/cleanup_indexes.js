import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: true
  }
);

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    const tables = ['system_design_problems', 'ml_system_design_notes'];

    for (const table of tables) {
      console.log(`\n🔍 Auditing table: ${table}`);
      const [results] = await sequelize.query(`SHOW INDEX FROM ${table}`);
      
      const indexes = {};
      results.forEach(idx => {
        if (!indexes[idx.Key_name]) indexes[idx.Key_name] = [];
        indexes[idx.Key_name].push(idx.Column_name);
      });

      const names = Object.keys(indexes);
      console.log(`Found ${names.length} distinct index names.`);

      // Identify redundant indexes on 'slug' and 'id'
      // Keep 'PRIMARY' and the FIRST index for 'slug' or 'title'
      const toKeep = ['PRIMARY'];
      let keptSlug = false;

      const toDrop = [];

      names.forEach(name => {
        if (name === 'PRIMARY') return;
        
        // Strategy: Keep the FIRST index that covers 'slug' or 'title'
        const cols = indexes[name];
        if ((cols.includes('slug') || cols.includes('title')) && !keptSlug) {
          console.log(`Keeping index: ${name} [${cols.join(', ')}]`);
          keptSlug = true;
          toKeep.push(name);
        } else {
          toDrop.push(name);
        }
      });

      console.log(`Total to drop: ${toDrop.length}`);
      
      for (const name of toDrop) {
        console.log(`Dropping index ${name} from ${table}...`);
        try {
          // In MySQL, you drop indexes by name
          await sequelize.query(`ALTER TABLE ${table} DROP INDEX ${name}`);
          console.log(`✅ Dropped ${name}`);
        } catch (err) {
          console.error(`❌ Failed to drop ${name}:`, err.message);
        }
      }
    }

    console.log('\n✨ Database cleanup complete.');

  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await sequelize.close();
  }
}

cleanup();
