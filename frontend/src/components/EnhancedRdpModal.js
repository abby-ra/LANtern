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
            // For control mode, use direct launch method
            directLaunchRdp(connection, mode);
        }
    };

    const directLaunchRdp = async (connection, mode) => {
        try {
            setAlert({
                show: true,
                message: `Launching direct RDP ${mode} connection to ${machine.name}...`,
                variant: 'info'
            });

            // Method 1: Try the simple RDP endpoint for direct launch
            try {
                const simpleResponse = await axios.post(`${API_BASE_URL}/simple-rdp`, {
                    ip: machine.ip_address || machine.ip,
                    username: machine.username || 'administrator',
                    password: machine.password || '',
                    mode: mode,
                    machineName: machine.name
                });

                if (simpleResponse.data.success) {
                    setAlert({
                        show: true,
                        message: `RDP ${mode.toUpperCase()} Connection Launched Successfully!

Connected to: ${machine.name} (${machine.ip_address})
Method: Direct RDP Launch (No Downloads)
Authentication: Automatic using stored credentials
Mode: ${mode === 'control' ? 'Full Control Access - You now have complete control' : 'Shadow Mode - View only access'}

Connection Status:
• RDP Window: Opening automatically
• Authentication: Automatic login in progress
• Performance: Native RDP performance
• Access Level: ${mode === 'control' ? 'Complete desktop control (remote user will be disconnected)' : 'View-only monitoring'}

Next Steps: The RDP window should appear on your screen shortly. If not visible, check your taskbar or use Alt+Tab.`,
                        variant: 'success'
                    });

                    setTimeout(() => onHide(), 4000);
                    return;
                }
            } catch (simpleError) {
                console.log('Simple RDP endpoint failed, trying enhanced method...', simpleError);
            }

            // Method 2: Try the enhanced RDP endpoint for direct launch
            try {
                const launchResponse = await axios.post(`${API_BASE_URL}/remote-access/launch-rdp`, {
                    machineId: machine.id,
                    mode: mode
                });

                if (launchResponse.data.success) {
                    setAlert({
                        show: true,
                        message: `Direct RDP ${mode} connection launched to ${machine.name}! The RDP window should open automatically with full access.`,
                        variant: 'success'
                    });

                    setTimeout(() => onHide(), 3000);
                    return;
                }
            } catch (launchError) {
                console.log('Enhanced RDP launch failed, using fallback...', launchError);
            }

            // Method 3: Fallback to file download if direct launch fails
            console.log('Direct launch methods failed, falling back to file download...');
            downloadAndLaunchRdp(connection, mode);

        } catch (error) {
            console.error('Direct RDP launch failed:', error);
            setAlert({
                show: true,
                message: `Failed to launch RDP connection: ${error.message}. Trying fallback method...`,
                variant: 'warning'
            });
            
            // Fallback to download method
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

            // Method 1: Open web-based live screen viewer in new window
            const liveViewerUrl = `/live-viewer?machineId=${machine.id}&name=${encodeURIComponent(machine.name)}&ip=${encodeURIComponent(machine.ip_address)}`;
            
            const viewerWindow = window.open(
                liveViewerUrl,
                `live_viewer_${machine.id}`,
                'width=1280,height=800,scrollbars=no,toolbar=no,menubar=no,location=no'
            );
            
            if (viewerWindow) {
                setAlert({
                    show: true,
                    message: `👁️ **Live Remote Desktop Viewer Opened!**

🖥️ **Connected to**: ${machine.name} (${machine.ip_address})
🌐 **AI-Enhanced Viewer**: Real-time visual desktop viewing in browser
🔒 **Authentication**: Automatic using stored credentials
👀 **Shadow Mode**: View-only access without interrupting user

✅ **Live Visual Features:**
• **Real-time desktop streaming** with AI enhancement
• **Auto-refreshing screenshots** every 1-2 seconds
• **Full-screen support** with quality controls
• **Non-intrusive monitoring** - user continues working normally
• **No downloads required** - pure web-based viewing
• **Screenshot capture** and save functionality

📋 **Viewer Details:**
• **Target**: ${machine.ip_address} (${machine.name})
• **Mode**: Live visual shadow session
• **Quality**: Adjustable (1-10 scale)
• **Updates**: Real-time with configurable intervals
• **Enhancement**: AI-powered screen capture

💡 **Usage Tips:**
• Use fullscreen button for immersive viewing
• Adjust refresh rate for optimal performance
• Take screenshots using the camera button
• Toggle auto-refresh on/off as needed

The live remote desktop viewer is now running in a separate window with real-time visual streaming!`,
                    variant: 'success'
                });

                // Close modal after successful connection
                setTimeout(() => {
                    onHide();
                }, 3000);
                return;
            } else {
                setAlert({
                    show: true,
                    message: 'Please allow popups to open the live remote desktop viewer.',
                    variant: 'warning'
                });
                return;
            }

        } catch (error) {
            console.error('Direct shadow connection failed:', error);
            setAlert({
                show: true,
                message: `Failed to establish live visual connection: ${error.message}`,
                variant: 'danger'
            });
        }
    };

    const downloadAndLaunchRdp = (connection, mode) => {
        // Create RDP file content
        const rdpContent = createRdpFileContent(connection, mode);
        
        // Create and download the RDP file
        const blob = new Blob([rdpContent], { type: 'application/rdp' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${machine.name}_${mode}_rdp.rdp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setAlert({
            show: true,
            message: `RDP file downloaded for ${machine.name}. Click the downloaded file to connect.`,
            variant: 'success'
        });
    };

    const createRdpFileContent = (connection, mode) => {
        const rdpConfig = {
            'full address': `s:${connection.ipAddress}:3389`,
            'username': `s:${connection.credentials.username}`,
            'screen mode id': 'i:2',
            'authentication level': 'i:0',
            'prompt for credentials': 'i:0',
            'compression': 'i:1',
            'displayconnectionbar': 'i:1',
            'autoreconnection enabled': 'i:1',
            'smart sizing': 'i:1',
        };

        if (mode === 'shadow') {
            rdpConfig['shadow'] = 'i:1';
            rdpConfig['shadowing mode'] = 'i:1';
            rdpConfig['shadow quality'] = 'i:2';
        }

        return Object.entries(rdpConfig)
            .map(([key, value]) => `${key}:${value}`)
            .join('\n');
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="enhanced-rdp-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-desktop me-2"></i>
                    Enhanced Remote Desktop - {machine?.name}
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
                                    <span><strong>Username:</strong> <code>{machine.username || 'Not set'}</code></span>
                                </div>
                            </div>
                            <div>
                                <Badge bg={machine.is_active ? "success" : "danger"}>
                                    <i className="fas fa-circle me-1"></i>
                                    {machine.is_active ? 'Online' : 'Offline'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                <Tabs defaultActiveKey="shadow" className="mb-3">
                    <Tab eventKey="shadow" title={
                        <>
                            <i className="fas fa-eye me-2"></i>
                            Shadow Mode (Visual Viewer)
                        </>
                    }>
                        <Card className="border-primary">
                            <Card.Body>
                                <div className="d-flex align-items-start justify-content-between mb-3">
                                    <div className="flex-grow-1">
                                        <h6 className="text-primary mb-2">
                                            <i className="fas fa-eye me-2"></i>
                                            Live Visual Shadow Mode
                                        </h6>
                                        <p className="text-muted mb-2">
                                            View the remote desktop in real-time without interrupting the user. 
                                            Perfect for monitoring, troubleshooting, and training scenarios.
                                        </p>
                                        <div className="mb-3">
                                            <h6 className="small fw-bold text-success">✅ Features Included:</h6>
                                            <ul className="small text-muted mb-0" style={{ listStyle: 'none', paddingLeft: '0' }}>
                                                <li>• <strong>Live desktop streaming</strong> in web browser</li>
                                                <li>• <strong>Real-time updates</strong> with configurable intervals</li>
                                                <li>• <strong>Full-screen support</strong> with quality controls</li>
                                                <li>• <strong>Screenshot capture</strong> and save functionality</li>
                                                <li>• <strong>No interruption</strong> to the remote user</li>
                                                <li>• <strong>Automatic authentication</strong> using stored credentials</li>
                                            </ul>
                                        </div>
                                        <div className="mb-3">
                                            <h6 className="small fw-bold text-info">ℹ️ How Shadow Mode Works:</h6>
                                            <ul className="small text-muted mb-0" style={{ listStyle: 'none', paddingLeft: '0' }}>
                                                <li>• You can observe their screen in real-time</li>
                                                <li>• The remote user continues working normally</li>
                                                <li>• Screen stays on for user - no disconnection</li>
                                                <li>• View-only access - cannot control their mouse/keyboard</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={() => connectRDP('shadow')}
                                        disabled={!machine?.is_active || isConnecting}
                                        className="d-flex align-items-center"
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-eye me-2"></i>
                                                Start Live Visual Viewer
                                            </>
                                        )}
                                    </Button>
                                    
                                    {!machine?.is_active && (
                                        <div className="alert alert-warning mb-0 p-2 small">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            Machine appears offline
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Tab>

                    <Tab eventKey="control" title={
                        <>
                            <i className="fas fa-mouse-pointer me-2"></i>
                            Control Mode
                        </>
                    }>
                        <Card className="border-warning">
                            <Card.Body>
                                <div className="d-flex align-items-start justify-content-between mb-3">
                                    <div className="flex-grow-1">
                                        <h6 className="text-warning mb-2">
                                            <i className="fas fa-mouse-pointer me-2"></i>
                                            Full Control Mode
                                        </h6>
                                        <p className="text-muted mb-2">
                                            Take full control of the remote desktop. User will be disconnected during your session.
                                        </p>
                                        <div className="mb-3">
                                            <h6 className="small fw-bold text-warning">⚠️ Control Mode Features:</h6>
                                            <ul className="small text-muted mb-0" style={{ listStyle: 'none', paddingLeft: '0' }}>
                                                <li>• <strong>Full remote control</strong> (mouse and keyboard)</li>
                                                <li>• <strong>File transfer</strong> capabilities</li>
                                                <li>• <strong>Clipboard sharing</strong></li>
                                                <li>• <strong>Audio redirection</strong></li>
                                                <li>• <strong>User session takeover</strong></li>
                                            </ul>
                                        </div>
                                        <div className="alert alert-warning p-2 small">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            <strong>Note:</strong> The remote user will be disconnected when you connect in control mode.
                                        </div>
                                    </div>
                                </div>
                                
                                <Button
                                    variant="warning"
                                    size="lg"
                                    onClick={() => connectRDP('control')}
                                    disabled={!machine?.is_active || isConnecting}
                                    className="d-flex align-items-center"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-mouse-pointer me-2"></i>
                                            Start Full Control Session
                                        </>
                                    )}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    <i className="fas fa-times me-2"></i>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EnhancedRdpModal;
