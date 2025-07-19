// Removed bcrypt import, no longer needed
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const wol = require('wol');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// Remote access endpoint for generating connection URLs and validation
app.post('/api/machines/:id/remote-access', async (req, res) => {
    try {
        const machineId = req.params.id;
        const { protocol, port } = req.body;
        
        // Get machine details
        const [machines] = await db.query('SELECT * FROM machines WHERE id = ?', [machineId]);
        if (machines.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        const machine = machines[0];
        
        // Validate protocol
        const supportedProtocols = {
            'web-rdp': { defaultPort: 3389, description: 'Web-based Remote Desktop Protocol' },
            'web-vnc': { defaultPort: 5900, description: 'Web-based VNC (Virtual Network Computing)' },
            'embedded-ssh': { defaultPort: 22, description: 'Web SSH Terminal' },
            'html5-rdp': { defaultPort: 3389, description: 'HTML5 Native RDP Client' }
        };
        
        if (!supportedProtocols[protocol]) {
            return res.status(400).json({ error: 'Unsupported protocol' });
        }
        
        const connectionPort = port || supportedProtocols[protocol].defaultPort;
        const protocolInfo = supportedProtocols[protocol];
        
        // Generate connection URLs based on protocol
        let connectionUrl = '';
        let connectionDetails = {
            protocol: protocol.toUpperCase(),
            port: connectionPort,
            description: protocolInfo.description,
            target: machine.ip_address,
            machine: machine.name
        };
        
        switch (protocol) {
            case 'web-rdp':
                // Apache Guacamole-style connection
                connectionUrl = `http://localhost:8080/guacamole/#/client/c/rdp?hostname=${machine.ip_address}&port=${connectionPort}&username=${machine.username || 'administrator'}&resize=true&width=1920&height=1080`;
                break;
                
            case 'web-vnc':
                // noVNC web client
                connectionUrl = `https://novnc.com/noVNC/vnc_lite.html?host=${machine.ip_address}&port=${connectionPort}&autoconnect=1&resize=scale&quality=6`;
                break;
                
            case 'embedded-ssh':
                // Generate data URL for embedded SSH terminal
                const sshHtml = generateSSHTerminalHTML(machine, connectionPort);
                connectionUrl = `data:text/html;base64,${Buffer.from(sshHtml).toString('base64')}`;
                break;
                
            case 'html5-rdp':
                // HTML5 RDP client
                connectionUrl = `https://html5rdp.com/connect?server=${machine.ip_address}&port=${connectionPort}&user=${machine.username || 'administrator'}&width=1920&height=1080`;
                break;
        }
        
        // Test connectivity before responding
        const pingCommand = `ping -n 1 ${machine.ip_address}`;
        const { exec } = require('child_process');
        
        exec(pingCommand, (error, stdout, stderr) => {
            const isReachable = !error;
            
            // Log remote access attempt
            try {
                db.query(
                    'INSERT INTO machine_logs (machine_id, action, result, timestamp) VALUES (?, ?, ?, NOW())',
                    [machineId, `remote_access_${protocol}`, isReachable ? 'success' : 'unreachable']
                );
            } catch (logError) {
                console.error('Failed to log remote access attempt:', logError);
            }
            
            res.json({
                success: true,
                connectionUrl,
                connectionDetails,
                isReachable,
                timestamp: new Date().toISOString(),
                warning: !isReachable ? 'Target machine may be unreachable. Connection might fail.' : null
            });
        });
        
    } catch (err) {
        console.error('Remote access error:', err);
        res.status(500).json({ error: 'Failed to prepare remote access' });
    }
});

// Helper function to generate SSH terminal HTML
function generateSSHTerminalHTML(machine, port = 22) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>SSH Terminal - ${machine.name}</title>
    <script src="https://unpkg.com/xterm@5.3.0/lib/xterm.js"></script>
    <script src="https://unpkg.com/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
    <script src="https://unpkg.com/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/xterm@5.3.0/css/xterm.css" />
    <style>
        body { 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #1a1a2e, #16213e); 
            font-family: 'Consolas', 'Monaco', monospace;
            color: #00ff00;
        }
        #terminal { 
            width: 100%; 
            height: 600px; 
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .connection-info { 
            color: #00ff88; 
            margin-bottom: 15px; 
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #00ff88;
        }
        .connection-info h3 {
            margin: 0 0 10px 0;
            color: #00ffff;
        }
        .copy-btn {
            background: #00ff88;
            color: #000;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            margin-left: 10px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="connection-info">
        <h3>🖥️ LANtern Remote SSH Terminal</h3>
        <strong>Target:</strong> ${machine.name} (${machine.ip_address}:${port})
        <br><strong>SSH Command:</strong> 
        <code id="ssh-cmd">ssh ${machine.username || 'root'}@${machine.ip_address} -p ${port}</code>
        <button class="copy-btn" onclick="copySSHCommand()">Copy</button>
    </div>
    <div id="terminal"></div>
    <script>
        const term = new Terminal({
            theme: {
                background: '#000012',
                foreground: '#00ff00',
                cursor: '#00ff00',
                selection: 'rgba(0, 255, 0, 0.3)'
            },
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 14
        });
        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(document.getElementById('terminal'));
        fitAddon.fit();
        
        term.writeln('\\x1b[32m╔════════════════════════════════════════════════╗\\x1b[0m');
        term.writeln('\\x1b[32m║           LANtern Remote SSH Terminal          ║\\x1b[0m');
        term.writeln('\\x1b[32m╚════════════════════════════════════════════════╝\\x1b[0m');
        term.writeln('');
        term.writeln('\\x1b[36mTarget Machine: \\x1b[33m${machine.name}\\x1b[0m');
        term.writeln('\\x1b[36mIP Address: \\x1b[33m${machine.ip_address}:${port}\\x1b[0m');
        term.writeln('\\x1b[36mUsername: \\x1b[33m${machine.username || 'root'}\\x1b[0m');
        term.writeln('');
        term.writeln('\\x1b[93mTo connect, use your terminal with the SSH command above,\\x1b[0m');
        term.writeln('\\x1b[93mor set up a proper SSH web terminal server.\\x1b[0m');
        term.writeln('');
        term.writeln('\\x1b[92mThis interface is a placeholder for demonstration.\\x1b[0m');
        term.writeln('\\x1b[92mFor real SSH access, use: ssh ${machine.username || 'root'}@${machine.ip_address}\\x1b[0m');
        term.writeln('');
        term.write('\\x1b[32m$ \\x1b[0m');
        
        function copySSHCommand() {
            const cmd = document.getElementById('ssh-cmd').textContent;
            navigator.clipboard.writeText(cmd).then(() => {
                alert('SSH command copied to clipboard!');
            });
        }
        
        // Simple command simulation
        let currentInput = '';
        term.onData(data => {
            if (data === '\\r') {
                term.writeln('');
                if (currentInput.trim()) {
                    term.writeln('\\x1b[31m[Simulated] Command: ' + currentInput + '\\x1b[0m');
                    term.writeln('\\x1b[93mThis is a demo terminal. Use real SSH client for actual connection.\\x1b[0m');
                }
                currentInput = '';
                term.write('\\x1b[32m$ \\x1b[0m');
            } else if (data === '\\u007f') {
                if (currentInput.length > 0) {
                    currentInput = currentInput.slice(0, -1);
                    term.write('\\b \\b');
                }
            } else {
                currentInput += data;
                term.write(data);
            }
        });
    </script>
</body>
</html>`;
}

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
