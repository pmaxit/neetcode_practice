import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    console.log('Successfully connected to the database!');
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    console.log('Test query result:', rows[0].result);
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Protocol connection lost - usually means server closed it or proxy is stale.');
    }
  }
}

test();
