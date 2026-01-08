const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL.replace('&channel_binding=require', '');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Test connection
    const timeResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected! Current time:', timeResult.rows[0].now);
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pastes'
      );
    `);
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    // Get all pastes
    const result = await pool.query('SELECT * FROM pastes ORDER BY created_at DESC');
    
    console.log('\n📊 Total pastes in database:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\n📝 Recent pastes:');
      result.rows.forEach((paste, index) => {
        console.log(`\n${index + 1}. ID: ${paste.id}`);
        console.log(`   Title: ${paste.title}`);
        console.log(`   Content: ${paste.content.substring(0, 50)}...`);
        console.log(`   Views: ${paste.view_count}`);
        console.log(`   Created: ${paste.created_at}`);
      });
    } else {
      console.log('\n⚠️  No pastes found in database!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();