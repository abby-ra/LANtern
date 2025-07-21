import React, { useState, useEffect } from 'react';
import { Modal, Alert, Badge, Button, Form, Spinner, Tab, Tabs, Card } from 'react-bootstrap';
import axios from 'axios';
import EnhancedRdpModal from './EnhancedRdpModal';

const API_BASE_URL = 'http://localhost:3001/api';

const VisualRemoteAccessModal = ({ show, onHide, machine }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeTab, setActiveTab] = useState('quick-access');
    const [remoteConnection, setRemoteConnection] = useState(null);
    const [accessMethods, setAccessMethods] = useState([]);
    const [showEnhancedRdp, setShowEnhancedRdp] = useState(false);

    // Reset modal state when closed
    useEffect(() => {
        if (!show) {
            setIsConnecting(false);
            setAlert({ show: false, message: '', variant: 'success' });
            setRemoteConnection(null);
            setAccessMethods([]);
            setShowEnhancedRdp(false);
        }
    }, [show]);

    // Setup available access methods for the machine
    useEffect(() => {
        if (show && machine) {
            setupAccessMethods();
        }
    }, [show, machine]);

    const setupAccessMethods = () => {
        const methods = [
            {
                id: 'rdp',
                name: 'Enhanced Remote Desktop (RDP)',
                icon: 'fas fa-desktop',
                description: 'Advanced RDP with Shadow Mode - view desktop without interrupting user',
                color: 'primary',
                requirements: 'Windows machine with RDP enabled - Auto-login included',
                port: 3389,
                available: machine?.is_active
            },
            {
                id: 'vnc',
                name: 'VNC Viewer',
                icon: 'fas fa-eye',
                description: 'Cross-platform screen sharing and remote control',
                color: 'info', 
                requirements: 'VNC server running on target machine',
                port: 5900,
                available: machine?.is_active
            },
            {
                id: 'web_vnc',
                name: 'Web-based Remote Desktop',
                icon: 'fas fa-globe',
                description: 'Browser-based remote desktop (no software needed)',
                color: 'success',
                requirements: 'Web VNC server or noVNC setup',
                port: 6080,
                available: machine?.is_active
            },
            {
                id: 'ssh',
                name: 'SSH Terminal',
                icon: 'fas fa-terminal',
                description: 'Command-line access for advanced users',
                color: 'dark',
                requirements: 'SSH server enabled on target machine', 
                port: 22,
                available: machine?.is_active
            }
        ];
        setAccessMethods(methods);
    };

    // Start direct remote access session
    const startRemoteAccess = async (accessType) => {
        if (!machine) return;

        // For RDP, open enhanced modal instead of direct connection
        if (accessType === 'rdp') {
            setShowEnhancedRdp(true);
            return;
        }

        setIsConnecting(true);
        try {
            setAlert({
                show: true,
                message: `Establishing ${accessType.toUpperCase()} connection to ${machine.name}...`,
                variant: 'info'
            });

            const response = await axios.post(`${API_BASE_URL}/remote-access/direct`, {
                machineId: machine.id,
                accessType: accessType
            });

            if (response.data.success) {
                const connection = response.data.connection;
                setRemoteConnection(connection);

                // Handle different access types
                switch (accessType) {
                    case 'vnc':
                        handleVncConnection(connection);
                        break;
                    case 'web_vnc':
                        handleWebVncConnection(connection);
                        break;
                    case 'ssh':
                        handleSshConnection(connection);
                        break;
                }
            } else {
                throw new Error('Failed to establish connection');
            }
        } catch (error) {
            console.error('Remote access failed:', error);
            setAlert({
                show: true,
                message: `Failed to connect: ${error.response?.data?.details || error.message}`,
                variant: 'danger'
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleRdpConnection = (connection) => {
        if (connection.rdpFile) {
            // Create and download RDP file with automatic authentication
            const blob = new Blob([connection.rdpFile.content], { type: 'application/rdp' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = connection.rdpFile.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Try to automatically launch RDP file (works on Windows)
            setTimeout(() => {
                try {
                    // For Windows, try to execute the RDP file directly
                    if (navigator.platform.toLowerCase().includes('win')) {
                        // Create a temporary URL scheme to launch RDP
                        const rdpUrl = `rdp://${encodeURIComponent(connection.machineName)}/${encodeURIComponent(connection.ipAddress)}`;
                        window.location.href = rdpUrl;
                    }
                } catch (error) {
                    console.log('Direct RDP launch not supported on this platform');
                }
            }, 1000);

            setAlert({
                show: true,
                message: `🖥️ Shadow RDP connection initiated to ${machine.name}! 
                
✅ **Features enabled:**
• **Shadow mode** - View actual desktop without interrupting user
• **Automatic login** - No password prompt required  
• **Full desktop access** - Mouse and keyboard control when needed

📁 RDP file downloaded: ${connection.rdpFile.filename}
🔗 If it doesn't open automatically, check your downloads folder and double-click the file.

💡 **Shadow Mode**: The user on ${machine.name} can continue working normally while you observe or assist.`,
                variant: 'success'
            });
        }
    };

    const handleVncConnection = (connection) => {
        if (connection.vncUrl) {
            // Try to open with VNC client
            window.open(connection.vncUrl, '_blank');
            setAlert({
                show: true,
                message: `Opening VNC connection to ${machine.name}. Make sure you have a VNC viewer installed.`,
                variant: 'success'
            });
        }
    };

    const handleWebVncConnection = (connection) => {
        if (connection.webVncUrl) {
            // Open web-based VNC in new window
            const vncWindow = window.open(
                connection.webVncUrl, 
                '_blank', 
                'width=1200,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no'
            );
            
            if (vncWindow) {
                setAlert({
                    show: true,
                    message: `Web-based remote desktop opened for ${machine.name}. Check the new browser window.`,
                    variant: 'success'
                });
            } else {
                setAlert({
                    show: true,
                    message: 'Please allow popups to open the web-based remote desktop.',
                    variant: 'warning'
                });
            }
        }
    };

    const handleSshConnection = (connection) => {
        if (connection.sshCommand) {
            // Copy SSH command to clipboard
            navigator.clipboard.writeText(connection.sshCommand).then(() => {
                setAlert({
                    show: true,
                    message: `SSH command copied to clipboard: ${connection.sshCommand}. Open your terminal and paste to connect.`,
                    variant: 'success'
                });
            });
        }
    };

    const getStatusBadge = (isOnline) => {
        return isOnline ? (
            <Badge bg="success" className="me-2">
                <i className="fas fa-circle me-1"></i>Online
            </Badge>
        ) : (
            <Badge bg="danger" className="me-2">
                <i className="fas fa-circle me-1"></i>Offline
            </Badge>
        );
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="visual-remote-access-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-desktop me-2"></i>
                    Visual Remote Access - {machine?.name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {alert.show && (
                    <Alert 
                        variant={alert.variant} 
                        onClose={() => setAlert({ ...alert, show: false })} 
                        dismissible
                        className="mb-3"
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
                                {getStatusBadge(machine.is_active)}
                            </div>
                        </div>
                    </div>
                )}

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                    <Tab eventKey="quick-access" title={
                        <>
                            <i className="fas fa-rocket me-2"></i>
                            Quick Access
                        </>
                    }>
                        <div className="row">
                            {accessMethods.map(method => (
                                <div key={method.id} className="col-md-6 mb-3">
                                    <Card className={`h-100 ${method.available ? '' : 'opacity-50'}`}>
                                        <Card.Body>
                                            <div className="d-flex align-items-start justify-content-between">
                                                <div className="flex-grow-1">
                                                    <h6 className="card-title mb-2">
                                                        <i className={`${method.icon} me-2 text-${method.color}`}></i>
                                                        {method.name}
                                                    </h6>
                                                    <p className="card-text small text-muted mb-2">
                                                        {method.description}
                                                    </p>
                                                    <small className="text-muted">
                                                        <i className="fas fa-plug me-1"></i>
                                                        Port: {method.port}
                                                    </small>
                                                    <br />
                                                    <small className="text-muted">
                                                        <i className="fas fa-info-circle me-1"></i>
                                                        {method.requirements}
                                                    </small>
                                                </div>
                                                <div className="ms-3">
                                                    <Button
                                                        variant={method.color}
                                                        size="sm"
                                                        onClick={() => startRemoteAccess(method.id)}
                                                        disabled={!method.available || isConnecting}
                                                        className="d-flex align-items-center"
                                                    >
                                                        {isConnecting ? (
                                                            <Spinner animation="border" size="sm" className="me-1" />
                                                        ) : (
                                                            <i className={`fas ${method.id === 'rdp' ? 'fa-cogs' : 'fa-play'} me-1`}></i>
                                                        )}
                                                        {method.id === 'rdp' ? 'Configure' : 'Connect'}
                                                    </Button>
                                                    {!method.available && (
                                                        <small className="text-muted d-block mt-1">
                                                            Machine offline
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </div>
                            ))}
                        </div>

                        {!machine?.is_active && (
                            <Alert variant="warning" className="mt-3">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                <strong>Machine Offline:</strong> The target machine appears to be offline. 
                                Remote access may not work until the machine is powered on and network accessible.
                                <br />
                                <small>Try using the "Start" action first to wake up the machine via Wake-on-LAN.</small>
                            </Alert>
                        )}
                    </Tab>

                    <Tab eventKey="connection-info" title={
                        <>
                            <i className="fas fa-info-circle me-2"></i>
                            Connection Details
                        </>
                    }>
                        {remoteConnection ? (
                            <div>
                                <h6>Active Connection Details</h6>
                                <div className="bg-light p-3 rounded">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <strong>Machine:</strong> {remoteConnection.machineName}<br />
                                            <strong>IP Address:</strong> <code>{remoteConnection.ipAddress}</code><br />
                                            <strong>Access Type:</strong> {remoteConnection.accessType.toUpperCase()}<br />
                                        </div>
                                        <div className="col-md-6">
                                            <strong>Status:</strong> {remoteConnection.isOnline ? 'Online' : 'Offline'}<br />
                                            <strong>Username:</strong> <code>{remoteConnection.credentials.username}</code><br />
                                            <strong>Password:</strong> {remoteConnection.credentials.hasPassword ? '✓ Stored' : '✗ Not stored'}<br />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Alert variant="info">
                                <i className="fas fa-info-circle me-2"></i>
                                No active connection. Use the Quick Access tab to establish a remote connection.
                            </Alert>
                        )}
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    <i className="fas fa-times me-2"></i>
                    Close
                </Button>
                {machine?.is_active && (
                    <Button 
                        variant="primary" 
                        onClick={() => setShowEnhancedRdp(true)}
                        disabled={isConnecting}
                    >
                        {isConnecting ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-desktop me-2"></i>
                                Enhanced RDP Access
                            </>
                        )}
                    </Button>
                )}
            </Modal.Footer>

            {/* Enhanced RDP Modal */}
            <EnhancedRdpModal
                show={showEnhancedRdp}
                onHide={() => setShowEnhancedRdp(false)}
                machine={machine}
            />
        </Modal>
    );
};

export default VisualRemoteAccessModal;
