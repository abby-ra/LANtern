require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const wol = require('wol');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files for web-based remote access
app.use('/public', express.static('public'));
app.use('/vnc.html', express.static('public/vnc.html'));
app.use('/screenshots', express.static('screenshots')); // Serve saved screenshots

const PORT = process.env.PORT || 3001;

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'power_management',
    port: process.env.DB_PORT || 3306
};

let db;

async function initDb() {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
}

initDb().catch(err => console.error('Database connection failed:', err));

// Helper function to execute remote shutdown
async function remoteShutdown(ip, username, password, action = 'shutdown') {
    const commands = {
        shutdown: `shutdown /s /m \\\\${ip} /t 0 /f`,
        restart: `shutdown /r /m \\\\${ip} /t 0 /f`
    };

    // Create a temporary batch file with credentials
    const cmd = `net use \\\\${ip} /user:${username} ${password} && ${commands[action]}`;
    
    console.log(`\n=== REMOTE ${action.toUpperCase()} DEBUG ===`);
    console.log(`Target IP: ${ip}`);
    console.log(`Username: ${username}`);
    console.log(`Command: ${commands[action]}`);
    
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            console.log(`Command execution completed for ${ip}`);
            console.log(`Error:`, error ? error.message : 'None');
            console.log(`STDOUT:`, stdout || 'Empty');
            console.log(`STDERR:`, stderr || 'Empty');
            console.log(`=== END REMOTE ${action.toUpperCase()} DEBUG ===\n`);
            
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`Command stderr: ${stderr}`);
                return reject(new Error(stderr));
            }
            resolve(stdout);
        });
    });
}

// API Routes
app.get('/api/machines', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM machines');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

app.post('/api/machines', async (req, res) => {
    try {
        const { name, mac_address, ip_address, subnet_mask, broadcast_address, username, password } = req.body;
        
        console.log('Creating machine with:', { name, mac_address, ip_address, subnet_mask, broadcast_address, username, password: '***' });
        
        const [result] = await db.query(
            'INSERT INTO machines (name, mac_address, ip_address, subnet_mask, broadcast_address, username, encrypted_password) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, mac_address, ip_address, subnet_mask, broadcast_address, username, password]
        );
        
        console.log('Machine created with ID:', result.insertId);
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error('Machine creation error:', err);
        res.status(500).json({ error: 'Failed to add machine' });
    }
});

app.post('/api/machines/:id/wake', async (req, res) => {
    try {
        const machineId = req.params.id;
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        
        // Enhanced Wake-on-LAN with multiple packet transmission
        const sendMultipleWolPackets = async (macAddress, broadcastAddress) => {
            const promises = [];
            const packetCount = 3; // Send 3 packets for reliability
            const addresses = [
                broadcastAddress,
                '255.255.255.255', // Global broadcast
                machine.ip_address // Direct IP (if machine supports it)
            ];
            
            // Send packets to multiple addresses for better reliability
            for (const address of addresses) {
                for (let i = 0; i < packetCount; i++) {
                    promises.push(
                        new Promise((resolve, reject) => {
                            setTimeout(() => {
                                wol.wake(macAddress, { 
                                    address: address,
                                    port: 9 // Standard WoL port
                                }, (err) => {
                                    if (err) {
                                        console.warn(`WoL packet failed to ${address}:`, err.message);
                                        resolve(false);
                                    } else {
                                        console.log(`WoL packet sent successfully to ${address}`);
                                        resolve(true);
                                    }
                                });
                            }, i * 100); // 100ms delay between packets
                        })
                    );
                }
            }
            
            return Promise.all(promises);
        };
        
        console.log(`Sending enhanced Wake-on-LAN to ${machine.mac_address}`);
        const results = await sendMultipleWolPackets(machine.mac_address, machine.broadcast_address);
        const successCount = results.filter(result => result === true).length;
        
        if (successCount > 0) {
            // Log the power event
            await db.query(
                'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                [machineId, 'wake', 'success', req.body.initiated_by || 'system']
            );
            
            res.json({ 
                message: `Wake-on-LAN packets sent successfully (${successCount}/${results.length} packets delivered)`,
                packetsDelivered: successCount,
                totalPackets: results.length
            });
        } else {
            await db.query(
                'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                [machineId, 'wake', 'failed', req.body.initiated_by || 'system']
            );
            
            res.status(500).json({ error: 'All Wake-on-LAN packets failed to send' });
        }
    } catch (err) {
        console.error('Wake-on-LAN error:', err);
        res.status(500).json({ error: 'Failed to wake machine' });
    }
});

app.post('/api/machines/:id/shutdown', async (req, res) => {
    try {
        const machineId = req.params.id;
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        const password = req.body.password; // In real app, use proper auth
        
        await remoteShutdown(machine.ip_address, machine.username, password, 'shutdown');
        
        // Log the power event
        await db.query(
            'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
            [machineId, 'shutdown', 'success', req.body.initiated_by || 'system']
        );
        
        res.json({ message: 'Shutdown command sent successfully' });
    } catch (err) {
        console.error(err);
        
        // Log failed event
        await db.query(
            'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
            [req.params.id, 'shutdown', 'failed', req.body.initiated_by || 'system']
        );
        
        res.status(500).json({ error: 'Failed to shutdown machine' });
    }
});

app.post('/api/machines/cluster-action', async (req, res) => {
    try {
        const { machineIds, action, initiated_by } = req.body;
        
        console.log(`\n=== CLUSTER ACTION DEBUG ===`);
        console.log(`Action: ${action}`);
        console.log(`Machine IDs: ${JSON.stringify(machineIds)}`);
        console.log(`Initiated by: ${initiated_by}`);
        
        if (!machineIds || !Array.isArray(machineIds) ){
            return res.status(400).json({ error: 'Invalid machine IDs' });
        }
        
        const [machines] = await db.query('SELECT * FROM machines WHERE id IN (?)', [machineIds]);
        console.log(`Found ${machines.length} machines in database`);
        
        // Execute all commands in parallel for better performance
        const machinePromises = machines.map(async (machine) => {
            console.log(`\nProcessing machine: ${machine.name} (${machine.ip_address})`);
            try {
                if (action === 'wake') {
                    // Enhanced Wake-on-LAN with multiple packet transmission
                    const sendMultipleWolPackets = async (macAddress, broadcastAddress, ipAddress) => {
                        const promises = [];
                        const packetCount = 3; // Send 3 packets for reliability
                        const addresses = [
                            broadcastAddress,
                            '255.255.255.255', // Global broadcast
                            ipAddress // Direct IP (if machine supports it)
                        ];
                        
                        console.log(`Sending enhanced Wake-on-LAN to ${macAddress} via addresses: ${addresses.join(', ')}`);
                        
                        // Send packets to multiple addresses for better reliability
                        for (const address of addresses) {
                            for (let i = 0; i < packetCount; i++) {
                                promises.push(
                                    new Promise((resolve) => {
                                        setTimeout(() => {
                                            wol.wake(macAddress, { 
                                                address: address,
                                                port: 9 // Standard WoL port
                                            }, (err) => {
                                                if (err) {
                                                    console.warn(`WoL packet failed to ${address}:`, err.message);
                                                    resolve(false);
                                                } else {
                                                    console.log(`WoL packet sent successfully to ${address}`);
                                                    resolve(true);
                                                }
                                            });
                                        }, i * 100); // 100ms delay between packets
                                    })
                                );
                            }
                        }
                        
                        const results = await Promise.all(promises);
                        const successCount = results.filter(result => result === true).length;
                        
                        if (successCount === 0) {
                            throw new Error('All Wake-on-LAN packets failed to send');
                        }
                        
                        console.log(`Enhanced WoL completed: ${successCount}/${results.length} packets delivered`);
                        return { successCount, totalPackets: results.length };
                    };
                    
                    await sendMultipleWolPackets(machine.mac_address, machine.broadcast_address, machine.ip_address);
                } else {
                    // Use password from database
                    const password = machine.encrypted_password;
                    console.log(`Executing ${action} command for ${machine.ip_address} with user ${machine.username}`);
                    await remoteShutdown(machine.ip_address, machine.username, password, action);
                }
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                    [machine.id, action, 'success', initiated_by || 'system']
                );
                return { machineId: machine.id, status: 'success' };
            } catch (err) {
                console.error(`Failed to ${action} machine ${machine.id}:`, err);
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                    [machine.id, action, 'failed', initiated_by || 'system']
                );
                return { machineId: machine.id, status: 'failed', error: err.message };
            }
        });

        // Wait for all parallel operations to complete
        const results = await Promise.allSettled(machinePromises);
        
        // Process results from Promise.allSettled
        const processedResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Promise rejected for machine ${machines[index].id}:`, result.reason);
                return { 
                    machineId: machines[index].id, 
                    status: 'failed', 
                    error: result.reason?.message || 'Unknown error' 
                };
            }
        });
        res.json({ results: processedResults });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to perform cluster action' });
    }
});

// Ping machine to check status
app.post('/api/machines/:id/ping', async (req, res) => {
    try {
        const machineId = req.params.id;
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        const startTime = Date.now();
        
        // Use ping command based on OS
        const isWindows = process.platform === 'win32';
        const pingCommand = isWindows 
            ? `ping -n 1 -w 3000 ${machine.ip_address}`
            : `ping -c 1 -W 3 ${machine.ip_address}`;
        
        exec(pingCommand, async (error, stdout, stderr) => {
            const responseTime = Date.now() - startTime;
            let isOnline = false;
            let parsedResponseTime = null;
            
            // Log ping command and results for debugging
            console.log(`\n=== PING DEBUG for ${machine.name} (${machine.ip_address}) ===`);
            console.log(`Command: ${pingCommand}`);
            console.log(`Error:`, error ? error.message : 'None');
            console.log(`STDOUT:`, stdout || 'Empty');
            console.log(`STDERR:`, stderr || 'Empty');
            console.log(`Total execution time: ${responseTime}ms`);
            
            if (!error && stdout) {
                // Check if ping was successful
                if (isWindows) {
                    isOnline = stdout.includes('Reply from') && !stdout.includes('Request timed out');
                    console.log(`Windows ping check - Reply from: ${stdout.includes('Reply from')}, Timeout: ${stdout.includes('Request timed out')}`);
                    // Extract response time from Windows ping
                    const timeMatch = stdout.match(/time[<=](\d+)ms/);
                    if (timeMatch) {
                        parsedResponseTime = parseInt(timeMatch[1]);
                        console.log(`Extracted response time: ${parsedResponseTime}ms`);
                    }
                } else {
                    isOnline = stdout.includes('1 received') || stdout.includes('1 packets received');
                    console.log(`Unix ping check - 1 received: ${stdout.includes('1 received')}, packets received: ${stdout.includes('1 packets received')}`);
                    // Extract response time from Unix ping
                    const timeMatch = stdout.match(/time=(\d+\.?\d*) ms/);
                    if (timeMatch) {
                        parsedResponseTime = Math.round(parseFloat(timeMatch[1]));
                        console.log(`Extracted response time: ${parsedResponseTime}ms`);
                    }
                }
            } else {
                // If there's an error or no stdout, machine is considered offline/idle
                isOnline = false;
                console.log(`Ping failed - machine considered offline/idle`);
            }
            
            console.log(`Final result - isOnline: ${isOnline}, parsedResponseTime: ${parsedResponseTime}`);
            console.log(`=== END PING DEBUG ===\n`);
            
            // Log ping result
            try {
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by, response_time) VALUES (?, ?, ?, ?, ?)',
                    [machineId, 'ping', isOnline ? 'success' : 'failed', 'system', parsedResponseTime]
                );
                
                // Update machine active status
                await db.query(
                    'UPDATE machines SET is_active = ?, last_ping = NOW() WHERE id = ?',
                    [isOnline ? 1 : 0, machineId]
                );
            } catch (dbError) {
                console.error('Database error during ping logging:', dbError);
            }
            
            res.json({
                isOnline,
                responseTime: parsedResponseTime,
                totalTime: responseTime,
                machine: machine.name,
                ip: machine.ip_address
            });
        });
    } catch (err) {
        console.error('Ping error:', err);
        res.status(500).json({ error: 'Failed to ping machine' });
    }
});

// Cluster management endpoints
app.get('/api/clusters', async (req, res) => {
    try {
        const [clusters] = await db.query('SELECT * FROM clusters');
        res.json(clusters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch clusters' });
    }
});

app.get('/api/clusters/:id', async (req, res) => {
    try {
        const [cluster] = await db.query('SELECT * FROM clusters WHERE id = ?', [req.params.id]);
        if (cluster.length === 0) {
            return res.status(404).json({ error: 'Cluster not found' });
        }
        
        const [machines] = await db.query(
            `SELECT m.* FROM machines m
             JOIN machine_cluster mc ON m.id = mc.machine_id
             WHERE mc.cluster_id = ?`,
            [req.params.id]
        );
        
        res.json({ ...cluster[0], machines });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch cluster details' });
    }
});

app.post('/api/clusters', async (req, res) => {
    try {
        const { name, description, machineIds } = req.body;
        
        console.log('Creating cluster with:', { name, description, machineIds });
        
        const [result] = await db.query(
            'INSERT INTO clusters (name, description) VALUES (?, ?)',
            [name, description]
        );
        
        const clusterId = result.insertId;
        console.log('Cluster created with ID:', clusterId);
        
        if (machineIds && machineIds.length > 0) {
            const values = machineIds.map(machineId => [machineId, clusterId]);
            console.log('Adding machine associations:', values);
            await db.query(
                'INSERT INTO machine_cluster (machine_id, cluster_id) VALUES ?',
                [values]
            );
        }
        
        res.status(201).json({ id: clusterId });
    } catch (err) {
        console.error('Cluster creation error:', err);
        res.status(500).json({ error: 'Failed to create cluster' });
    }
});

app.put('/api/clusters/:id', async (req, res) => {
    try {
        const { name, description, machineIds } = req.body;
        
        await db.query(
            'UPDATE clusters SET name = ?, description = ? WHERE id = ?',
            [name, description, req.params.id]
        );
        
        // Update machine associations
        await db.query('DELETE FROM machine_cluster WHERE cluster_id = ?', [req.params.id]);
        
        if (machineIds && machineIds.length > 0) {
            const values = machineIds.map(machineId => [machineId, req.params.id]);
            await db.query(
                'INSERT INTO machine_cluster (machine_id, cluster_id) VALUES ?',
                [values]
            );
        }
        
        res.json({ message: 'Cluster updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update cluster' });
    }
});

app.delete('/api/clusters/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM clusters WHERE id = ?', [req.params.id]);
        res.json({ message: 'Cluster deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete cluster' });
    }
});

app.post('/api/clusters/:id/action', async (req, res) => {
    try {
        const clusterId = req.params.id;
        const { action, password, initiated_by } = req.body;
        
        // Get all machines in this cluster
        const [machines] = await db.query(
            `SELECT m.* FROM machines m
             JOIN machine_cluster mc ON m.id = mc.machine_id
             WHERE mc.cluster_id = ?`,
            [clusterId]
        );
        
        if (machines.length === 0) {
            return res.status(400).json({ error: 'Cluster has no machines' });
        }
        
        // Execute all commands in parallel for better performance
        const machinePromises = machines.map(async (machine) => {
            try {
                if (action === 'wake') {
                    // Enhanced Wake-on-LAN with multiple packet transmission
                    const sendMultipleWolPackets = async (macAddress, broadcastAddress, ipAddress) => {
                        const promises = [];
                        const packetCount = 3; // Send 3 packets for reliability
                        const addresses = [
                            broadcastAddress,
                            '255.255.255.255', // Global broadcast
                            ipAddress // Direct IP (if machine supports it)
                        ];
                        
                        // Send packets to multiple addresses for better reliability
                        for (const address of addresses) {
                            for (let i = 0; i < packetCount; i++) {
                                promises.push(
                                    new Promise((resolve) => {
                                        setTimeout(() => {
                                            wol.wake(macAddress, { 
                                                address: address,
                                                port: 9 // Standard WoL port
                                            }, (err) => {
                                                if (err) {
                                                    console.warn(`WoL packet failed to ${address}:`, err.message);
                                                    resolve(false);
                                                } else {
                                                    console.log(`WoL packet sent successfully to ${address}`);
                                                    resolve(true);
                                                }
                                            });
                                        }, i * 100); // 100ms delay between packets
                                    })
                                );
                            }
                        }
                        
                        const results = await Promise.all(promises);
                        const successCount = results.filter(result => result === true).length;
                        
                        if (successCount === 0) {
                            throw new Error('All Wake-on-LAN packets failed to send');
                        }
                        
                        return { successCount, totalPackets: results.length };
                    };
                    
                    console.log(`Sending enhanced Wake-on-LAN to ${machine.mac_address}`);
                    await sendMultipleWolPackets(machine.mac_address, machine.broadcast_address, machine.ip_address);
                } else {
                    // Use password from database
                    const password = machine.encrypted_password;
                    await remoteShutdown(machine.ip_address, machine.username, password, action);
                }
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                    [machine.id, action, 'success', initiated_by || 'system']
                );
                return { machineId: machine.id, status: 'success' };
            } catch (err) {
                console.error(`Failed to ${action} machine ${machine.id}:`, err);
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by) VALUES (?, ?, ?, ?)',
                    [machine.id, action, 'failed', initiated_by || 'system']
                );
                return { machineId: machine.id, status: 'failed', error: err.message };
            }
        });

        // Wait for all parallel operations to complete
        const results = await Promise.allSettled(machinePromises);
        
        // Process results from Promise.allSettled
        const processedResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`Promise rejected for machine ${machines[index].id}:`, result.reason);
                return { 
                    machineId: machines[index].id, 
                    status: 'failed', 
                    error: result.reason?.message || 'Unknown error' 
                };
            }
        });
        res.json({ results: processedResults });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to perform cluster action' });
    }
});

app.put('/api/machines/:id', async (req, res) => {
    try {
        const machineId = req.params.id;
        const { name, mac_address, ip_address, subnet_mask, broadcast_address, username, password } = req.body;
        
        console.log('Updating machine with ID:', machineId, { name, mac_address, ip_address, subnet_mask, broadcast_address, username, password: '***' });
        
        await db.query(
            'UPDATE machines SET name = ?, mac_address = ?, ip_address = ?, subnet_mask = ?, broadcast_address = ?, username = ?, encrypted_password = ? WHERE id = ?',
            [name, mac_address, ip_address, subnet_mask, broadcast_address, username, password, machineId]
        );
        
        console.log('Machine updated successfully');
        res.json({ message: 'Machine updated successfully' });
    } catch (err) {
        console.error('Machine update error:', err);
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

app.delete('/api/machines/:id', async (req, res) => {
    try {
        const machineId = req.params.id;
        
        console.log('Deleting machine with ID:', machineId);
        
        // First, remove machine from any clusters
        await db.query('DELETE FROM machine_cluster WHERE machine_id = ?', [machineId]);
        
        // Then delete the machine
        await db.query('DELETE FROM machines WHERE id = ?', [machineId]);
        
        console.log('Machine deleted successfully');
        res.json({ message: 'Machine deleted successfully' });
    } catch (err) {
        console.error('Machine deletion error:', err);
        res.status(500).json({ error: 'Failed to delete machine' });
    }
});

app.patch('/api/machines/:id/status', async (req, res) => {
    try {
        const machineId = req.params.id;
        const { is_active } = req.body;
        
        console.log('Updating machine status:', machineId, 'to', is_active);
        
        await db.query(
            'UPDATE machines SET is_active = ? WHERE id = ?',
            [is_active, machineId]
        );
        
        console.log('Machine status updated successfully');
        res.json({ message: 'Machine status updated successfully' });
    } catch (err) {
        console.error('Machine status update error:', err);
        res.status(500).json({ error: 'Failed to update machine status' });
    }
});

// MeshCentral Integration Endpoints
app.post('/api/meshcentral/connect', async (req, res) => {
    try {
        const { serverUrl, username, password, domain = 'default', machineId } = req.body;
        
        console.log(`Attempting remote access connection for machine ID: ${machineId}`);
        
        // Get machine credentials from database
        let machineCredentials = null;
        if (machineId) {
            const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
            if (rows.length > 0) {
                machineCredentials = rows[0];
                console.log(`Found machine: ${machineCredentials.name} (${machineCredentials.ip_address})`);
            }
        }
        
        // In a real implementation, you would make actual HTTP requests to MeshCentral API
        // For now, we'll simulate the connection and use stored machine credentials
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Enhanced mock response with machine-specific data
        const mockResponse = {
            success: true,
            sessionId: 'session_' + Date.now(),
            userRights: ['desktop', 'terminal', 'files'],
            serverVersion: '1.1.24',
            machineInfo: machineCredentials ? {
                id: machineCredentials.id,
                name: machineCredentials.name,
                ip: machineCredentials.ip_address,
                hasCredentials: !!machineCredentials.encrypted_password
            } : null
        };
        
        console.log('Remote access connection established');
        res.json(mockResponse);
        
    } catch (err) {
        console.error('Remote access connection failed:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to establish remote access connection',
            details: err.message 
        });
    }
});

app.post('/api/meshcentral/nodes', async (req, res) => {
    try {
        const { serverUrl, sessionId, machineId } = req.body;
        
        // Get machine details from database including credentials
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        console.log(`Setting up remote access for machine: ${machine.name} (${machine.ip_address})`);
        
        // Check if machine credentials are available
        const hasCredentials = machine.username && machine.encrypted_password;
        
        // Create enhanced node data with multiple access methods
        const remoteAccessNode = {
            id: `machine_${machine.id}`,
            name: machine.name,
            ip: machine.ip_address,
            mac: machine.mac_address,
            status: machine.is_active ? 'online' : 'offline',
            platform: 'Windows', // Could be determined from machine data or OS detection
            lastSeen: new Date().toISOString(),
            meshId: `mesh_${machine.id}`,
            nodeType: 'desktop',
            capabilities: ['desktop', 'terminal', 'files'],
            credentials: {
                available: hasCredentials,
                username: machine.username || 'administrator',
                // Don't send actual password, just indicate availability
                hasPassword: !!machine.encrypted_password
            },
            accessMethods: [
                {
                    type: 'rdp',
                    name: 'Remote Desktop Protocol',
                    port: 3389,
                    available: hasCredentials && machine.is_active
                },
                {
                    type: 'vnc', 
                    name: 'VNC Viewer',
                    port: 5900,
                    available: machine.is_active
                },
                {
                    type: 'web_vnc',
                    name: 'Web-based VNC',
                    port: 6080,
                    available: machine.is_active
                }
            ]
        };
        
        console.log(`Remote access node configured for ${machine.name} with ${hasCredentials ? 'stored' : 'no'} credentials`);
        res.json({ nodes: [remoteAccessNode] });
        
    } catch (err) {
        console.error('Failed to setup remote access node:', err);
        res.status(500).json({ 
            error: 'Failed to configure remote access',
            details: err.message 
        });
    }
});

// New endpoint for direct visual remote access
app.post('/api/remote-access/direct', async (req, res) => {
    try {
        const { machineId, accessType = 'rdp' } = req.body;
        
        // Get machine with credentials
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        console.log(`Setting up direct ${accessType} access to ${machine.name} (${machine.ip_address})`);
        
        // Prepare connection details
        const connectionDetails = {
            machineId: machine.id,
            machineName: machine.name,
            ipAddress: machine.ip_address,
            accessType: accessType,
            isOnline: machine.is_active === 1,
            credentials: {
                username: machine.username || 'administrator',
                hasPassword: !!machine.encrypted_password
            }
        };
        
        // Generate different connection methods based on access type
        switch (accessType) {
            case 'rdp':
                // Create RDP connection data with automatic authentication and shadow mode
                const rdpContent = `full address:s:${machine.ip_address}:3389
username:s:${machine.username || 'administrator'}
password 51:b:${machine.encrypted_password ? Buffer.from(machine.encrypted_password).toString('base64') : ''}
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
displayconnectionbar:i:1
redirectprinters:i:1
redirectclipboard:i:1
autoreconnection enabled:i:1
authentication level:i:0
prompt for credentials:i:0
negotiate security layer:i:1
enablecredsspsupport:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
gatewayhostname:s:
gatewayusagemethod:i:0
gatewaycredentialssource:i:0
gatewayprofileusagemethod:i:1
promptcredentialonce:i:1
use redirection server name:i:0
rdgiskdcproxy:i:0
kdcproxyname:s:
drivestoredirect:s:
devicestoredirect:s:
winposstr:s:0,1,0,0,1920,1080
pcb:s:
full address:s:${machine.ip_address}:3389
disable wallpaper:i:0
disable full window drag:i:0
disable menu anims:i:0
disable themes:i:0
bitmapcachepersistenable:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
smart sizing:i:1
shadow:i:1`;

                connectionDetails.rdpFile = {
                    content: rdpContent,
                    filename: `${machine.name.replace(/\s+/g, '_')}_shadow.rdp`
                };

                // Also provide direct connection command for advanced users
                connectionDetails.directCommand = `mstsc "${machine.name.replace(/\s+/g, '_')}_shadow.rdp"`;
                break;
                
            case 'vnc':
                connectionDetails.vncUrl = `vnc://${machine.ip_address}:5900`;
                break;
                
            case 'web_vnc':
                // For web-based VNC, create a URL that opens our custom VNC viewer
                connectionDetails.webVncUrl = `http://localhost:3001/vnc.html?host=${machine.ip_address}&port=6080&name=${encodeURIComponent(machine.name)}&password=${encodeURIComponent(machine.encrypted_password || '')}`;
                break;
                
            case 'ssh':
                connectionDetails.sshCommand = `ssh ${machine.username || 'root'}@${machine.ip_address}`;
                break;
        }
        
        res.json({
            success: true,
            connection: connectionDetails
        });
        
    } catch (err) {
        console.error('Failed to setup direct remote access:', err);
        res.status(500).json({ 
            error: 'Failed to setup direct remote access',
            details: err.message 
        });
    }
});

app.post('/api/meshcentral/remote-session', async (req, res) => {
    try {
        const { nodeId, sessionType, machineId } = req.body;
        
        // Get machine details
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        
        // Log the remote access attempt
        console.log(`Starting ${sessionType} session for machine ${machine.name} (${machine.ip_address})`);
        
        // In a real implementation, you would:
        // 1. Generate a secure session token
        // 2. Create a session in MeshCentral
        // 3. Return the session URL
        
        const sessionUrl = `https://meshcentral.example.com/${sessionType}.htm?node=${nodeId}&auth=token123`;
        
        res.json({
            success: true,
            sessionUrl: sessionUrl,
            sessionType: sessionType,
            nodeId: nodeId,
            machineName: machine.name,
            machineIp: machine.ip_address
        });
        
    } catch (err) {
        console.error('Failed to create remote session:', err);
        res.status(500).json({ 
            error: 'Failed to create remote session',
            details: err.message 
        });
    }
});

// Enhanced RDP endpoint with shadow/control mode support
app.post('/api/remote-access/enhanced-rdp', async (req, res) => {
    try {
        const { machineId, mode = 'shadow', autoLogin = true } = req.body;
        
        // Get machine with credentials
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        console.log(`Setting up enhanced RDP (${mode} mode) for ${machine.name} (${machine.ip_address})`);
        
        // Create enhanced RDP file with shadow/control mode settings
        let rdpContent = `full address:s:${machine.ip_address}:3389
username:s:${machine.username || 'administrator'}`;

        // Add password for automatic authentication
        if (autoLogin && machine.encrypted_password) {
            rdpContent += `
password 51:b:${Buffer.from(machine.encrypted_password).toString('base64')}`;
        }

        // Configure connection based on mode
        if (mode === 'shadow') {
            // Shadow mode - view without taking control
            rdpContent += `
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
displayconnectionbar:i:1
redirectprinters:i:0
redirectclipboard:i:1
autoreconnection enabled:i:1
authentication level:i:0
prompt for credentials:i:0
negotiate security layer:i:1
enablecredsspsupport:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
disable wallpaper:i:0
disable full window drag:i:0
disable menu anims:i:0
disable themes:i:0
bitmapcachepersistenable:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
smart sizing:i:1
span monitors:i:0
use redirection server name:i:0
rdgiskdcproxy:i:0
shadow:i:1
shadowing mode:i:1
shadow quality:i:2`;
        } else {
            // Control mode - full desktop takeover
            rdpContent += `
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
displayconnectionbar:i:1
redirectprinters:i:1
redirectclipboard:i:1
autoreconnection enabled:i:1
authentication level:i:0
prompt for credentials:i:0
negotiate security layer:i:1
enablecredsspsupport:i:1
disable wallpaper:i:0
disable full window drag:i:0
disable menu anims:i:0
disable themes:i:0
bitmapcachepersistenable:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
smart sizing:i:1
span monitors:i:0
use redirection server name:i:0`;
        }

        const connectionDetails = {
            machineId: machine.id,
            machineName: machine.name,
            ipAddress: machine.ip_address,
            mode: mode,
            isOnline: machine.is_active === 1,
            rdpFile: {
                content: rdpContent,
                filename: `${machine.name.replace(/\s+/g, '_')}_${mode}.rdp`
            },
            credentials: {
                username: machine.username || 'administrator',
                autoLogin: autoLogin && !!machine.encrypted_password,
                password: machine.encrypted_password // Include for direct connections
            },
            directConnection: {
                shadowUrl: `ms-rd:${machine.ip_address}?shadow=1&username=${machine.username || 'administrator'}`,
                controlUrl: `ms-rd:${machine.ip_address}?username=${machine.username || 'administrator'}`,
                webViewerUrl: `http://localhost:3000/web-rdp-viewer.html?host=${machine.ip_address}&machine=${encodeURIComponent(machine.name)}&mode=${mode}&machineId=${machine.id}&quality=8`,
                command: mode === 'shadow' 
                    ? `mstsc /v:${machine.ip_address} /shadow:console /noConsentPrompt`
                    : `mstsc /v:${machine.ip_address}`
            }
        };

        console.log(`Enhanced RDP connection prepared for ${machine.name} in ${mode} mode`);
        res.json({
            success: true,
            connection: connectionDetails
        });
        
    } catch (err) {
        console.error('Failed to setup enhanced RDP:', err);
        res.status(500).json({ 
            error: 'Failed to setup enhanced RDP connection',
            details: err.message 
        });
    }
});

// Live screenshot endpoint for web-based remote desktop viewer
app.get('/api/machines/screenshot/:id', async (req, res) => {
    try {
        const machineId = req.params.id;
        
        // Get machine details
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        
        // Check if machine is online
        if (!machine.is_active) {
            // Return a "machine offline" image
            res.set('Content-Type', 'image/png');
            const offlineImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
            return res.send(offlineImage);
        }
        
        // In a real implementation, you would:
        // 1. Use RDP/VNC to capture the remote desktop
        // 2. Use Windows API to get screenshot via WMI
        // 3. Use a remote agent to capture screen
        
        // For now, return a simulated screenshot or cached image
        // This is where you'd integrate with your screenshot service
        
        // Try to get real screenshot (this would need to be implemented)
        try {
            // Example: Use remote PowerShell or WMI to get screenshot
            // const screenshot = await captureRemoteScreenshot(machine.ip_address, machine.username, machine.encrypted_password);
            
            // For demonstration, create a dynamic image showing machine info
            const canvas = require('canvas');
            const { createCanvas } = canvas;
            
            const width = 1920;
            const height = 1080;
            const canvasObj = createCanvas(width, height);
            const ctx = canvasObj.getContext('2d');
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#1e3c72');
            gradient.addColorStop(1, '#2a5298');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Machine info overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(50, 50, 400, 200);
            
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.fillText(`Machine: ${machine.name}`, 70, 90);
            ctx.fillText(`IP: ${machine.ip_address}`, 70, 130);
            ctx.fillText(`Status: Online`, 70, 170);
            ctx.fillText(`Time: ${new Date().toLocaleString()}`, 70, 210);
            
            // Taskbar simulation
            ctx.fillStyle = '#1f1f1f';
            ctx.fillRect(0, height - 40, width, 40);
            
            // Start button
            ctx.fillStyle = '#0078d4';
            ctx.fillRect(0, height - 40, 60, 40);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('⊞', 20, height - 15);
            
            // Clock
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            const timeText = new Date().toLocaleTimeString();
            const timeWidth = ctx.measureText(timeText).width;
            ctx.fillText(timeText, width - timeWidth - 20, height - 15);
            
            // Convert to PNG buffer
            const buffer = canvasObj.toBuffer('image/png');
            
            // Save screenshot to disk with timestamp
            const screenshotsDir = path.join(__dirname, 'screenshots');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${machine.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
            const filepath = path.join(screenshotsDir, filename);
            
            try {
                // Ensure screenshots directory exists
                if (!fs.existsSync(screenshotsDir)) {
                    fs.mkdirSync(screenshotsDir, { recursive: true });
                }
                
                // Save the screenshot
                fs.writeFileSync(filepath, buffer);
                console.log(`Screenshot saved: ${filename}`);
                
                // Log screenshot capture to database
                await db.query(
                    'INSERT INTO power_events (machine_id, action, status, initiated_by, response_time) VALUES (?, ?, ?, ?, ?)',
                    [machineId, 'screenshot', 'success', 'system', Date.now()]
                );
                
            } catch (saveError) {
                console.error('Failed to save screenshot:', saveError);
            }
            
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'no-cache');
            res.set('X-Screenshot-Filename', filename); // Send filename in header
            res.send(buffer);
            
        } catch (screenshotError) {
            console.error('Screenshot capture failed:', screenshotError);
            
            // Return a simple placeholder image
            res.set('Content-Type', 'image/png');
            const placeholderImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
            res.send(placeholderImage);
        }
        
    } catch (error) {
        console.error('Screenshot endpoint error:', error);
        res.status(500).json({ error: 'Failed to capture screenshot', details: error.message });
    }
});

// Screenshot management endpoints
app.get('/api/screenshots', async (req, res) => {
    try {
        const screenshotsDir = path.join(__dirname, 'screenshots');
        
        // Ensure screenshots directory exists
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
            return res.json({ screenshots: [] });
        }
        
        // Read all files in screenshots directory
        const files = fs.readdirSync(screenshotsDir);
        const screenshots = [];
        
        for (const file of files) {
            if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                const filepath = path.join(screenshotsDir, file);
                const stats = fs.statSync(filepath);
                
                // Parse machine name from filename
                const machineName = file.split('_')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim();
                
                screenshots.push({
                    filename: file,
                    machineName: machineName,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    url: `/screenshots/${file}`
                });
            }
        }
        
        // Sort by creation date (newest first)
        screenshots.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        res.json({ screenshots });
        
    } catch (error) {
        console.error('Failed to list screenshots:', error);
        res.status(500).json({ error: 'Failed to list screenshots', details: error.message });
    }
});

// Get screenshots for a specific machine
app.get('/api/machines/:id/screenshots', async (req, res) => {
    try {
        const machineId = req.params.id;
        
        // Get machine details
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        const screenshotsDir = path.join(__dirname, 'screenshots');
        
        if (!fs.existsSync(screenshotsDir)) {
            return res.json({ screenshots: [] });
        }
        
        // Read all files and filter by machine name
        const files = fs.readdirSync(screenshotsDir);
        const machineScreenshots = [];
        const machineNamePattern = machine.name.replace(/[^a-zA-Z0-9]/g, '_');
        
        for (const file of files) {
            if (file.startsWith(machineNamePattern) && (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))) {
                const filepath = path.join(screenshotsDir, file);
                const stats = fs.statSync(filepath);
                
                machineScreenshots.push({
                    filename: file,
                    machineName: machine.name,
                    machineId: machine.id,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    url: `/screenshots/${file}`
                });
            }
        }
        
        // Sort by creation date (newest first)
        machineScreenshots.sort((a, b) => new Date(b.created) - new Date(a.created));
        
        res.json({ screenshots: machineScreenshots, machine: machine.name });
        
    } catch (error) {
        console.error('Failed to list machine screenshots:', error);
        res.status(500).json({ error: 'Failed to list machine screenshots', details: error.message });
    }
});

// Delete a specific screenshot
app.delete('/api/screenshots/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(__dirname, 'screenshots', filename);
        
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }
        
        fs.unlinkSync(filepath);
        console.log(`Screenshot deleted: ${filename}`);
        
        res.json({ message: 'Screenshot deleted successfully', filename });
        
    } catch (error) {
        console.error('Failed to delete screenshot:', error);
        res.status(500).json({ error: 'Failed to delete screenshot', details: error.message });
    }
});

// Clean up old screenshots (older than specified days)
app.post('/api/screenshots/cleanup', async (req, res) => {
    try {
        const { days = 7 } = req.body; // Default to 7 days
        const screenshotsDir = path.join(__dirname, 'screenshots');
        
        if (!fs.existsSync(screenshotsDir)) {
            return res.json({ message: 'No screenshots directory found', deleted: 0 });
        }
        
        const files = fs.readdirSync(screenshotsDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        let deletedCount = 0;
        const deletedFiles = [];
        
        for (const file of files) {
            if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                const filepath = path.join(screenshotsDir, file);
                const stats = fs.statSync(filepath);
                
                if (stats.birthtime < cutoffDate) {
                    fs.unlinkSync(filepath);
                    deletedCount++;
                    deletedFiles.push(file);
                    console.log(`Old screenshot deleted: ${file}`);
                }
            }
        }
        
        res.json({ 
            message: `Cleanup completed. Deleted ${deletedCount} screenshots older than ${days} days.`,
            deleted: deletedCount,
            files: deletedFiles
        });
        
    } catch (error) {
        console.error('Failed to cleanup screenshots:', error);
        res.status(500).json({ error: 'Failed to cleanup screenshots', details: error.message });
    }
});

// AI-Enhanced Remote Desktop Screenshot API
app.get('/api/machines/screenshot/:id', async (req, res) => {
    try {
        const machineId = req.params.id;
        const aiEnhanced = req.query.ai === 'true';
        const quality = parseInt(req.query.quality) || 8;
        const enhance = req.query.enhance === 'true';
        
        console.log(`🎯 Remote Desktop Screenshot Request: Machine ${machineId}, Quality: ${quality}fps, AI: ${aiEnhanced}`);
        
        // Get machine from database
        const [rows] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = rows[0];
        console.log(`📡 Connecting to machine: ${machine.name} (${machine.ip_address})`);
        
        try {
            // Capture real remote desktop using AI-enhanced PowerShell method
            const screenshotResult = await captureAIEnhancedRemoteDesktop(
                machine.ip_address, 
                machine.username, 
                machine.encrypted_password,
                { quality, enhance: enhance.toString() }
            );
            
            const buffer = screenshotResult.buffer;
            const metadata = screenshotResult.metadata || {};
            
            console.log(`✅ Screenshot captured: ${buffer.length} bytes, ${metadata.width}x${metadata.height}`);
            
            // Set response headers
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.set('X-Capture-Method', 'ai-enhanced-rdp');
            res.set('X-Machine-Name', machine.name);
            res.set('X-Machine-IP', machine.ip_address);
            res.set('X-Timestamp', new Date().toISOString());
            
            if (metadata.width) res.set('X-Screen-Width', metadata.width.toString());
            if (metadata.height) res.set('X-Screen-Height', metadata.height.toString());
            if (metadata.quality) res.set('X-Quality-Level', metadata.quality.toString());
            if (metadata.enhanced) res.set('X-AI-Enhanced', metadata.enhanced.toString());
            
            res.send(buffer);
            
        } catch (captureError) {
            console.error(`❌ Screenshot capture failed for ${machine.name}:`, captureError.message);
            
            // Try fallback method with basic PowerShell
            try {
                console.log('🔄 Trying fallback capture method...');
                const fallbackResult = await captureBasicRemoteDesktop(
                    machine.ip_address, 
                    machine.username, 
                    machine.encrypted_password
                );
                
                res.set('Content-Type', 'image/png');
                res.set('X-Capture-Method', 'fallback-basic');
                res.set('X-Machine-Name', machine.name);
                res.send(fallbackResult);
                
            } catch (fallbackError) {
                console.error('❌ Fallback capture also failed:', fallbackError.message);
                
                // Generate error image
                const errorImage = await generateErrorImage(machine, captureError.message);
                res.set('Content-Type', 'image/png');
                res.set('X-Capture-Method', 'error-image');
                res.send(errorImage);
            }
        }
        
    } catch (error) {
        console.error('❌ Screenshot API error:', error);
        res.status(500).json({ 
            error: 'Screenshot capture failed', 
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Real-time streaming endpoint for continuous updates
app.get('/api/machines/stream/:id', async (req, res) => {
    const machineId = req.params.id;
    const quality = parseInt(req.query.quality) || 5;
    
    console.log(`🎬 Starting real-time stream for machine ${machineId}, quality: ${quality}fps`);
    
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    
    let streaming = true;
    const streamInterval = Math.max(1000 / quality, 100); // Min 100ms between frames
    
    const streamLoop = async () => {
        if (!streaming) return;
        
        try {
            const response = await axios.get(`http://localhost:${PORT}/api/machines/screenshot/${machineId}?quality=${quality}&ai=true`, {
                responseType: 'arraybuffer'
            });
            
            if (response.status === 200) {
                const buffer = Buffer.from(response.data);
                res.write(`--frame\r\n`);
                res.write(`Content-Type: image/png\r\n`);
                res.write(`Content-Length: ${buffer.length}\r\n\r\n`);
                res.write(buffer);
                res.write(`\r\n`);
            }
        } catch (error) {
            console.error('Stream frame error:', error.message);
        }
        
        setTimeout(streamLoop, streamInterval);
    };
    
    req.on('close', () => {
        streaming = false;
        console.log(`🛑 Stream closed for machine ${machineId}`);
    });
    
    streamLoop();
});

// AI-Enhanced Remote Desktop Capture Function
async function captureAIEnhancedRemoteDesktop(ipAddress, username, password, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`🤖 AI-Enhanced capture from ${ipAddress} with ${options.quality}fps quality`);
        
        const aiScript = `
try {
    # Create secure credential
    $securePassword = ConvertTo-SecureString "${password}" -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential("${username}", $securePassword)
    
    # Test connectivity first
    $pingTest = Test-NetConnection -ComputerName "${ipAddress}" -Port 5985 -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $pingTest) {
        # Try HTTPS port
        $pingTest = Test-NetConnection -ComputerName "${ipAddress}" -Port 5986 -InformationLevel Quiet -WarningAction SilentlyContinue
    }
    
    if (-not $pingTest) {
        throw "Cannot connect to remote machine ${ipAddress}. WinRM might not be enabled."
    }
    
    Write-Host "✅ Connection test passed for ${ipAddress}"
    
    # Create remote session
    $sessionOptions = New-PSSessionOption -SkipCACheck -SkipCNCheck
    $session = New-PSSession -ComputerName "${ipAddress}" -Credential $credential -SessionOption $sessionOptions -ErrorAction Stop
    
    Write-Host "🔗 Remote PowerShell session established"
    
    # AI-Enhanced screen capture script block (runs on remote machine)
    $captureBlock = {
        param($Quality, $Enhance)
        
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        try {
            Write-Host "📷 Starting screen capture on remote machine..."
            
            # Get all screens and primary screen
            $screens = [System.Windows.Forms.Screen]::AllScreens
            $primaryScreen = [System.Windows.Forms.Screen]::PrimaryScreen
            $bounds = $primaryScreen.Bounds
            
            Write-Host "🖥️ Remote screen: $($bounds.Width)x$($bounds.Height)"
            
            # Create high-quality bitmap
            $pixelFormat = if ($Enhance -eq "true") {
                [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
            } else {
                [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
            }
            
            $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height, $pixelFormat
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            
            # Set high-quality rendering
            $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            
            # Capture the actual desktop
            $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size, [System.Drawing.CopyPixelOperation]::SourceCopy)
            
            # Apply AI enhancement if requested
            if ($Enhance -eq "true") {
                Write-Host "🎨 Applying AI enhancement..."
                
                # Color enhancement matrix
                $colorMatrix = New-Object System.Drawing.Imaging.ColorMatrix
                $colorMatrix.Matrix00 = 1.2  # Red enhancement
                $colorMatrix.Matrix11 = 1.2  # Green enhancement
                $colorMatrix.Matrix22 = 1.2  # Blue enhancement
                $colorMatrix.Matrix33 = 1.0  # Alpha
                $colorMatrix.Matrix44 = 1.0  # W
                
                $imageAttributes = New-Object System.Drawing.Imaging.ImageAttributes
                $imageAttributes.SetColorMatrix($colorMatrix)
                
                $enhancedBitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
                $enhancedGraphics = [System.Drawing.Graphics]::FromImage($enhancedBitmap)
                $enhancedGraphics.DrawImage($bitmap, (New-Object System.Drawing.Rectangle 0, 0, $bounds.Width, $bounds.Height), 0, 0, $bounds.Width, $bounds.Height, [System.Drawing.GraphicsUnit]::Pixel, $imageAttributes)
                
                $bitmap.Dispose()
                $graphics.Dispose()
                $bitmap = $enhancedBitmap
                $graphics = $enhancedGraphics
                $imageAttributes.Dispose()
            }
            
            # Convert to PNG with optimal compression
            $memoryStream = New-Object System.IO.MemoryStream
            
            if ($Quality -ge 8) {
                $bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
            } else {
                # Use JPEG for lower quality/faster transfer
                $jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object {$_.MimeType -eq "image/jpeg"}
                $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
                $qualityLevel = 75 + ($Quality * 3)
                $qualityParam = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $qualityLevel)
                $encoderParams.Param[0] = $qualityParam
                $bitmap.Save($memoryStream, $jpegEncoder, $encoderParams)
            }
            
            $bytes = $memoryStream.ToArray()
            $base64 = [Convert]::ToBase64String($bytes)
            
            # Cleanup
            $graphics.Dispose()
            $bitmap.Dispose()
            $memoryStream.Dispose()
            
            Write-Host "✅ Capture completed: $($bytes.Length) bytes"
            
            # Return structured result
            $result = @{
                success = $true
                data = $base64
                width = $bounds.Width
                height = $bounds.Height
                quality = $Quality
                enhanced = $Enhance
                timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                size = $bytes.Length
                remoteHost = $env:COMPUTERNAME
                format = if ($Quality -ge 8) { "PNG" } else { "JPEG" }
            }
            
            return ($result | ConvertTo-Json -Depth 3)
            
        } catch {
            Write-Error "Remote capture failed: $($_.Exception.Message)"
            $errorResult = @{
                success = $false
                error = $_.Exception.Message
                remoteHost = $env:COMPUTERNAME
                timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
            return ($errorResult | ConvertTo-Json -Depth 2)
        }
    }
    
    # Execute capture on remote machine
    Write-Host "🚀 Executing capture script on remote machine..."
    $result = Invoke-Command -Session $session -ScriptBlock $captureBlock -ArgumentList ${options.quality}, "${options.enhance}" -ErrorAction Stop
    
    # Close session
    Remove-PSSession $session
    Write-Host "🔌 Remote session closed"
    
    # Output result
    Write-Output $result
    
} catch {
    Write-Error "AI-Enhanced capture failed: $($_.Exception.Message)"
    $errorResult = @{
        success = $false
        error = $_.Exception.Message
        targetHost = "${ipAddress}"
        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    Write-Output ($errorResult | ConvertTo-Json -Depth 2)
}
`;

        exec(`powershell -ExecutionPolicy Bypass -Command "${aiScript.replace(/"/g, '\\"')}"`, 
            { timeout: 60000, maxBuffer: 100 * 1024 * 1024 },
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ AI capture PowerShell error:`, error.message);
                    return reject(new Error(`PowerShell execution failed: ${error.message}`));
                }
                
                if (stderr) {
                    console.warn(`⚠️ PowerShell warnings:`, stderr);
                }
                
                try {
                    const cleanOutput = stdout.trim();
                    if (!cleanOutput) {
                        return reject(new Error('Empty PowerShell response'));
                    }
                    
                    console.log(`📄 PowerShell output preview:`, cleanOutput.substring(0, 200) + '...');
                    
                    const resultJson = JSON.parse(cleanOutput);
                    
                    if (!resultJson.success) {
                        return reject(new Error(`Remote capture failed: ${resultJson.error}`));
                    }
                    
                    const imageBuffer = Buffer.from(resultJson.data, 'base64');
                    
                    console.log(`✅ AI-Enhanced capture successful from ${resultJson.remoteHost}:`);
                    console.log(`   Size: ${imageBuffer.length} bytes`);
                    console.log(`   Resolution: ${resultJson.width}x${resultJson.height}`);
                    console.log(`   Format: ${resultJson.format}`);
                    console.log(`   Quality: ${resultJson.quality}`);
                    console.log(`   Enhanced: ${resultJson.enhanced}`);
                    
                    resolve({
                        buffer: imageBuffer,
                        metadata: {
                            width: resultJson.width,
                            height: resultJson.height,
                            quality: resultJson.quality,
                            enhanced: resultJson.enhanced,
                            timestamp: resultJson.timestamp,
                            remoteHost: resultJson.remoteHost,
                            size: imageBuffer.length,
                            format: resultJson.format,
                            isRealRemote: true
                        }
                    });
                    
                } catch (parseError) {
                    console.error('❌ Failed to parse AI capture result:', parseError.message);
                    console.error('📄 Raw output (first 1000 chars):', stdout.substring(0, 1000));
                    reject(new Error(`Failed to parse capture result: ${parseError.message}`));
                }
            }
        );
    });
}

// Basic Remote Desktop Capture (fallback)
async function captureBasicRemoteDesktop(ipAddress, username, password) {
    return new Promise((resolve, reject) => {
        console.log(`📷 Basic capture from ${ipAddress}`);
        
        const basicScript = `
try {
    $securePassword = ConvertTo-SecureString "${password}" -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential("${username}", $securePassword)
    
    $session = New-PSSession -ComputerName "${ipAddress}" -Credential $credential -ErrorAction Stop
    
    $captureBlock = {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen
        $bounds = $screen.Bounds
        
        $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)
        
        $memoryStream = New-Object System.IO.MemoryStream
        $bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $bytes = $memoryStream.ToArray()
        $base64 = [Convert]::ToBase64String($bytes)
        
        $graphics.Dispose()
        $bitmap.Dispose()
        $memoryStream.Dispose()
        
        return $base64
    }
    
    $result = Invoke-Command -Session $session -ScriptBlock $captureBlock -ErrorAction Stop
    Remove-PSSession $session
    
    Write-Output $result
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`;

        exec(`powershell -ExecutionPolicy Bypass -Command "${basicScript.replace(/"/g, '\\"')}"`, 
            { timeout: 30000 },
            (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }
                
                try {
                    const base64Data = stdout.trim();
                    if (base64Data && base64Data.length > 100) {
                        const imageBuffer = Buffer.from(base64Data, 'base64');
                        console.log(`✅ Basic capture successful: ${imageBuffer.length} bytes`);
                        resolve(imageBuffer);
                    } else {
                        reject(new Error('Invalid screenshot data'));
                    }
                } catch (parseError) {
                    reject(parseError);
                }
            }
        );
    });
}

// Generate error image when capture fails
async function generateErrorImage(machine, errorMessage) {
    const width = 1920;
    const height = 1080;
    
    // Create a simple error image using canvas
    const createCanvas = () => {
        const canvas = Buffer.alloc(width * height * 4);
        
        // Fill with dark blue background
        for (let i = 0; i < canvas.length; i += 4) {
            canvas[i] = 0x1a;     // R
            canvas[i + 1] = 0x1a; // G  
            canvas[i + 2] = 0x4a; // B
            canvas[i + 3] = 0xff; // A
        }
        
        return canvas;
    };
    
    const canvas = createCanvas();
    
    // For now, return a simple PNG header + data
    // In a real implementation, you'd use a proper canvas library
    const errorImage = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
        canvas.slice(0, 1000) // Simplified for demo
    ]);
    
    console.log(`🎨 Generated error image for ${machine.name}: ${errorMessage}`);
    return errorImage;
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
