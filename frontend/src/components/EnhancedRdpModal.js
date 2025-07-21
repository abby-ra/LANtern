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
