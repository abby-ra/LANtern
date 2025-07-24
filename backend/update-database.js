// Database Schema Update Script
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabase() {
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database...');

        // Check if response_time column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'power_management' 
            AND TABLE_NAME = 'power_events' 
            AND COLUMN_NAME = 'response_time'
        `);

        if (columns.length === 0) {
            console.log('Adding response_time column...');
            await connection.execute('ALTER TABLE power_events ADD COLUMN response_time BIGINT DEFAULT NULL');
            console.log('✓ response_time column added');
        } else {
            console.log('✓ response_time column already exists');
        }

        // Update the action enum to include screenshot and ping
        console.log('Updating action enum...');
        await connection.execute(`
            ALTER TABLE power_events 
            MODIFY COLUMN action ENUM('wake', 'shutdown', 'restart', 'screenshot', 'ping') NOT NULL
        `);
        console.log('✓ Action enum updated to include screenshot and ping');

        // Show the updated table structure
        console.log('\nUpdated table structure:');
        const [tableDesc] = await connection.execute('DESCRIBE power_events');
        console.table(tableDesc);

        console.log('\n✅ Database schema updated successfully!');

    } catch (error) {
        console.error('❌ Database update failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateDatabase();
