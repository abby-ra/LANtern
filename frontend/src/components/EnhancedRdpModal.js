import React, { useState, useEffect } from 'react';
import { Modal, Alert, Badge, Button, Form, Spinner, Tab, Tabs, Card, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const EnhancedRdpModal = ({ show, onHide, machine }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [rdpMode, setRdpMode] = useState('shadow'); // 'shadow' or 'control'
    const [connectionDetails, setConnectionDetails] = useState(null);

    useEffect(() => {
        if (!show) {
            setAlert({ show: false, message: '', variant: 'success' });
            setIsConnecting(false);
            setConnectionDetails(null);
        }
    }, [show]);

    const connectRDP = async (mode = 'shadow') => {
        if (!machine) return;

        setIsConnecting(true);
        try {
            setAlert({
                show: true,
                message: `Establishing ${mode} RDP connection to ${machine.name}...`,
                variant: 'info'
            });

            const response = await axios.post(`${API_BASE_URL}/remote-access/enhanced-rdp`, {
                machineId: machine.id,
                mode: mode, // 'shadow' or 'control'
                autoLogin: true
            });

            if (response.data.success) {
                const connection = response.data.connection;
                setConnectionDetails(connection);
                handleRdpLaunch(connection, mode);
            } else {
                throw new Error('Failed to establish RDP connection');
            }
        } catch (error) {
            console.error('RDP connection failed:', error);
            setAlert({
                show: true,
                message: `Failed to connect: ${error.response?.data?.details || error.message}`,
                variant: 'danger'
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRdpLaunch = (connection, mode) => {
        if (mode === 'shadow') {
            // For shadow mode, establish direct connection without downloads
            establishDirectShadowConnection(connection);
        } else {
            // For control mode, use the existing download method
            downloadAndLaunchRdp(connection, mode);
        }
    };

    const establishDirectShadowConnection = async (connection) => {
        try {
            setAlert({
                show: true,
                message: `🔗 Establishing direct shadow connection to ${machine.name}...`,
                variant: 'info'
            });

            // Use the direct connection information from backend
            if (connection.directConnection) {
                
                // Method 1: Open web-based visual viewer in new window
                if (connection.directConnection.webViewerUrl) {
                    const viewerWindow = window.open(
                        connection.directConnection.webViewerUrl,
                        '_blank',
                        'width=1280,height=800,scrollbars=no,toolbar=no,menubar=no'
                    );
                    
                    if (viewerWindow) {
                        setAlert({
                            show: true,
                            message: `👁️ **Visual Remote Desktop Viewer Opened!**

🖥️ **Connected to**: ${machine.name} (${connection.ipAddress})
🌐 **Web-Based Viewer**: Real-time visual desktop viewing in browser
🔒 **Authentication**: Automatic login with stored credentials
👀 **Shadow Mode**: View-only access without interrupting user

✅ **Visual Features:**
• **Live desktop streaming** in web browser
• **Real-time screenshot updates**
• **Full-screen support** with quality controls
• **Non-intrusive monitoring** - user continues working normally
• **No downloads required** - pure web-based viewing

📋 **Viewer Details:**
• **Target**: ${connection.ipAddress}:3389
• **User**: ${connection.credentials.username}
• **Mode**: View-only shadow session
• **Quality**: Adjustable (1-10 scale)
• **Updates**: Real-time with low latency

💡 **Usage Tips:**
• Click the fullscreen button for immersive viewing
• Adjust quality slider for optimal performance
• Take screenshots using the camera button
• Connection info panel available via the ℹ️ button

The visual remote desktop viewer is now running in a separate window with live desktop streaming.`,
                            variant: 'success'
                        });

                        // Close modal after successful connection
                        setTimeout(() => {
                            onHide();
                        }, 5000);
                        return;
                    }
                }

                // Method 2: Fallback to Windows RDP protocol handler
                try {
                    window.location.href = connection.directConnection.shadowUrl;
                    
                    // Give it a moment to process
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                } catch (error) {
                    console.warn('Protocol handler failed:', error);
                }

                // Method 3: Try creating a temporary RDP file in memory and execute it
                try {
                    // Create RDP file content for shadow mode with credentials
                    const shadowRdpContent = `full address:s:${connection.ipAddress}:3389
username:s:${connection.credentials.username}
password 51:b:${Buffer.from(connection.credentials.password || '').toString('base64')}
screen mode id:i:2
authentication level:i:0
prompt for credentials:i:0
shadow:i:1
shadowing mode:i:1
shadow quality:i:2
smart sizing:i:1
compression:i:1
keyboardhook:i:2
displayconnectionbar:i:1
autoreconnection enabled:i:1
audiocapturemode:i:0
videoplaybackmode:i:1`;

                    // Create temporary blob URL for direct execution
                    const blob = new Blob([shadowRdpContent], { type: 'application/rdp' });
                    const tempUrl = URL.createObjectURL(blob);
                    
                    // Try to open directly without download
                    window.open(tempUrl, '_self');
                    
                    // Cleanup
                    setTimeout(() => URL.revokeObjectURL(tempUrl), 5000);
                    
                } catch (error) {
                    console.warn('Direct execution failed:', error);
                }

                setAlert({
                    show: true,
                    message: `👁️ **Direct Shadow Session Initiated!**

🖥️ **Connected to**: ${machine.name} (${connection.ipAddress})
🔒 **Authentication**: Automatic login with stored credentials
👀 **Shadow Mode**: View-only access without interrupting user
⚡ **Direct Connection**: No file downloads required

✅ **Active Features:**
• **Real-time desktop viewing**
• **Automatic authentication**
• **Non-intrusive monitoring**
• **Full screen support**
• **Audio streaming enabled**

📋 **Shadow Session Details:**
• **Target**: ${connection.ipAddress}:3389
• **User**: ${connection.credentials.username}
• **Mode**: View-only (user can continue working normally)

💡 If the connection doesn't appear immediately:
1. Check Windows Remote Desktop Services are running
2. Verify shadow permissions are configured on ${machine.name}
3. Ensure firewall allows RDP connections

The shadow session will open automatically in Windows Remote Desktop Client.`,
                    variant: 'success'
                });

                // Close modal after successful connection
                setTimeout(() => {
                    onHide();
                }, 4000);

            } else {
                throw new Error('Direct connection information not available');
            }

        } catch (error) {
            console.error('Direct shadow connection failed:', error);
            setAlert({
                show: true,
                message: `❌ Direct shadow connection failed. Falling back to RDP file method...`,
                variant: 'warning'
            });
            
            // Fallback to traditional RDP file method
            downloadAndLaunchRdp(connection, 'shadow');
        }
    };

    const downloadAndLaunchRdp = (connection, mode) => {
        if (connection.rdpFile) {
            // Download RDP file with enhanced settings
            const blob = new Blob([connection.rdpFile.content], { type: 'application/rdp' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = connection.rdpFile.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Try direct launch on Windows
            setTimeout(() => {
                try {
                    if (navigator.platform.toLowerCase().includes('win')) {
                        // Use Windows protocol handler for RDP
                        window.location.href = `ms-rd:${connection.ipAddress}`;
                    }
                } catch (error) {
                    console.log('Direct launch not available');
                }
            }, 1000);

            const modeDescription = mode === 'shadow' 
                ? "👁️ **Shadow Mode**: You can view the desktop without interrupting the user's work"
                : "🎮 **Control Mode**: Full desktop control - user will see cursor movements";

            setAlert({
                show: true,
                message: `🖥️ Enhanced RDP connection initiated to ${machine.name}!

${modeDescription}

✅ **Features:**
• **Automatic authentication** - No password required
• **${mode === 'shadow' ? 'Non-intrusive viewing' : 'Full remote control'}**
• **High-quality display** - Optimized for ${machine.ip_address}
• **Clipboard sharing** enabled
• **Audio redirection** configured

📁 **File**: ${connection.rdpFile.filename}
🔧 **Mode**: ${mode.toUpperCase()}
⚡ **Status**: ${connection.isOnline ? 'Machine Online' : 'Machine may be offline'}

If the connection doesn't open automatically, double-click the downloaded RDP file.`,
                variant: 'success'
            });
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="enhanced-rdp-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-desktop me-2"></i>
                    Enhanced RDP Connection - {machine?.name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {alert.show && (
                    <Alert 
                        variant={alert.variant} 
                        onClose={() => setAlert({ ...alert, show: false })} 
                        dismissible
                        className="mb-3"
                        style={{ whiteSpace: 'pre-line' }}
                    >
                        {alert.message}
                    </Alert>
                )}

                {machine && (
                    <div className="mb-4 p-3 bg-light rounded">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="mb-1">
                                    <i className="fas fa-server me-2"></i>
                                    {machine.name}
                                </h6>
                                <div className="d-flex align-items-center gap-3">
                                    <span><strong>IP:</strong> <code>{machine.ip_address}</code></span>
                                    <span><strong>Username:</strong> <code>{machine.username || 'administrator'}</code></span>
                                    <span><strong>Auto-Login:</strong> <Badge bg="success">Enabled</Badge></span>
                                </div>
                            </div>
                            <div>
                                <Badge bg={machine.is_active ? 'success' : 'danger'}>
                                    <i className={`fas fa-circle me-1`}></i>
                                    {machine.is_active ? 'Online' : 'Offline'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                <div className="connection-modes mb-4">
                    <h6 className="mb-3">
                        <i className="fas fa-cogs me-2"></i>
                        Connection Mode
                    </h6>
                    
                    <div className="row">
                        <div className="col-md-6">
                            <Card className={`h-100 ${rdpMode === 'shadow' ? 'border-primary' : ''}`}>
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <i className="fas fa-eye fa-2x text-primary"></i>
                                    </div>
                                    <h6>Shadow Mode (Recommended)</h6>
                                    <p className="small text-muted mb-3">
                                        View the actual desktop without interrupting the user. 
                                        Perfect for monitoring or assistance.
                                    </p>
                                    <ul className="small text-start">
                                        <li>User continues working normally</li>
                                        <li>You can observe their screen</li>
                                        <li>Non-intrusive monitoring</li>
                                        <li>Screen stays on for user</li>
                                    </ul>
                                    <Button 
                                        variant={rdpMode === 'shadow' ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setRdpMode('shadow')}
                                        className="mt-2"
                                    >
                                        Select Shadow Mode
                                    </Button>
                                </Card.Body>
                            </Card>
                        </div>
                        <div className="col-md-6">
                            <Card className={`h-100 ${rdpMode === 'control' ? 'border-warning' : ''}`}>
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <i className="fas fa-mouse-pointer fa-2x text-warning"></i>
                                    </div>
                                    <h6>Control Mode</h6>
                                    <p className="small text-muted mb-3">
                                        Full remote desktop control. User will see your actions
                                        and may lose control temporarily.
                                    </p>
                                    <ul className="small text-start">
                                        <li>Full mouse and keyboard control</li>
                                        <li>User sees your cursor movements</li>
                                        <li>May interrupt user work</li>
                                        <li>Traditional RDP behavior</li>
                                    </ul>
                                    <Button 
                                        variant={rdpMode === 'control' ? 'warning' : 'outline-warning'}
                                        size="sm"
                                        onClick={() => setRdpMode('control')}
                                        className="mt-2"
                                    >
                                        Select Control Mode
                                    </Button>
                                </Card.Body>
                            </Card>
                        </div>
                    </div>
                </div>

                {connectionDetails && (
                    <div className="connection-info p-3 bg-success bg-opacity-10 border border-success rounded">
                        <h6 className="text-success">
                            <i className="fas fa-check-circle me-2"></i>
                            Connection Ready
                        </h6>
                        <div className="row">
                            <div className="col-md-6">
                                <small>
                                    <strong>Target:</strong> {connectionDetails.machineName}<br/>
                                    <strong>IP:</strong> <code>{connectionDetails.ipAddress}</code><br/>
                                    <strong>Mode:</strong> {rdpMode.toUpperCase()}
                                </small>
                            </div>
                            <div className="col-md-6">
                                <small>
                                    <strong>Authentication:</strong> Automatic<br/>
                                    <strong>File:</strong> {connectionDetails.rdpFile?.filename}<br/>
                                    <strong>Status:</strong> {connectionDetails.isOnline ? 'Ready' : 'Offline'}
                                </small>
                            </div>
                        </div>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    <i className="fas fa-times me-2"></i>
                    Close
                </Button>
                <Button 
                    variant="info"
                    onClick={() => {
                        if (connectionDetails?.directConnection?.webViewerUrl) {
                            window.open(
                                connectionDetails.directConnection.webViewerUrl,
                                '_blank',
                                'width=1280,height=800,scrollbars=no,toolbar=no,menubar=no'
                            );
                        } else {
                            // Create the URL manually if connection details aren't ready
                            const viewerUrl = `http://localhost:3000/web-rdp-viewer.html?host=${machine.ip_address}&machine=${encodeURIComponent(machine.name)}&mode=${rdpMode}&machineId=${machine.id}&quality=8`;
                            window.open(viewerUrl, '_blank', 'width=1280,height=800,scrollbars=no,toolbar=no,menubar=no');
                        }
                    }}
                    disabled={!machine?.is_active}
                    className="d-flex align-items-center me-2"
                >
                    <i className="fas fa-tv me-2"></i>
                    Visual Viewer
                </Button>
                <Button 
                    variant={rdpMode === 'shadow' ? 'primary' : 'warning'}
                    onClick={() => connectRDP(rdpMode)}
                    disabled={isConnecting || !machine?.is_active}
                    className="d-flex align-items-center"
                >
                    {isConnecting ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Connecting...
                        </>
                    ) : (
                        <>
                            <i className={`fas ${rdpMode === 'shadow' ? 'fa-eye' : 'fa-mouse-pointer'} me-2`}></i>
                            Connect via {rdpMode === 'shadow' ? 'Shadow' : 'Control'} Mode
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EnhancedRdpModal;
