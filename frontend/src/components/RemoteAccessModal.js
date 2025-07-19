import React, { useState, useEffect, useRef } from 'react';
import { Modal, Alert, Badge, Button, Form, InputGroup } from 'react-bootstrap';
import './animations.css';

const RemoteAccessModal = ({ show, onHide, machine }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionMethod, setConnectionMethod] = useState('rdp');
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!show) {
            setIsConnected(false);
            setIsConnecting(false);
            setAlert({ show: false, message: '', variant: 'success' });
        }
    }, [show]);

    const handleConnect = async () => {
        if (!machine) return;
        
        setIsConnecting(true);
        try {
            if (connectionMethod === 'rdp') {
                // For RDP, we'll open a new window/tab with RDP connection
                const rdpUrl = `mstsc /v:${machine.ip_address}`;
                setAlert({ 
                    show: true, 
                    message: `Opening RDP connection to ${machine.name} (${machine.ip_address}). Please check your downloads or RDP client.`, 
                    variant: 'info' 
                });
                
                // Create and download RDP file
                const rdpContent = `full address:s:${machine.ip_address}:3389
username:s:${machine.username || 'administrator'}
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
winposstr:s:0,3,0,0,800,600
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
audiomode:i:0
redirectprinters:i:1
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
redirectposdevices:i:0
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:0
negotiate security layer:i:1`;

                const blob = new Blob([rdpContent], { type: 'application/rdp' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${machine.name}-remote.rdp`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
            } else if (connectionMethod === 'ssh') {
                // For SSH, we can either open terminal or provide SSH command
                const sshCommand = `ssh ${machine.username || 'root'}@${machine.ip_address}`;
                navigator.clipboard.writeText(sshCommand).then(() => {
                    setAlert({ 
                        show: true, 
                        message: `SSH command copied to clipboard: ${sshCommand}. Open your terminal and paste to connect.`, 
                        variant: 'success' 
                    });
                });
                
            } else if (connectionMethod === 'vnc') {
                // For VNC, open VNC viewer
                const vncUrl = `vnc://${machine.ip_address}:5900`;
                setAlert({ 
                    show: true, 
                    message: `Opening VNC connection to ${machine.name} (${machine.ip_address}). Make sure VNC Server is running on the target machine.`, 
                    variant: 'info' 
                });
                window.open(vncUrl, '_blank');
                
            } else if (connectionMethod === 'web') {
                // Embedded web-based remote access (placeholder for future implementation)
                setAlert({ 
                    show: true, 
                    message: 'Web-based remote access is coming soon! Use RDP, SSH, or VNC for now.', 
                    variant: 'warning' 
                });
            }
            
            setIsConnected(true);
            
        } catch (error) {
            console.error('Connection failed:', error);
            setAlert({ 
                show: true, 
                message: `Failed to establish connection: ${error.message}`, 
                variant: 'danger' 
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setAlert({ show: false, message: '', variant: 'success' });
    };

    const getConnectionMethodIcon = (method) => {
        switch (method) {
            case 'rdp': return 'fas fa-desktop';
            case 'ssh': return 'fas fa-terminal';
            case 'vnc': return 'fas fa-eye';
            case 'web': return 'fas fa-globe';
            default: return 'fas fa-plug';
        }
    };

    const getConnectionMethodName = (method) => {
        switch (method) {
            case 'rdp': return 'Remote Desktop (RDP)';
            case 'ssh': return 'SSH Terminal';
            case 'vnc': return 'VNC Viewer';
            case 'web': return 'Web Remote Access';
            default: return 'Unknown';
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="remote-access-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-monitor me-2"></i>
                    Remote Access - {machine?.name}
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
                    <div className="mb-4">
                        <div className="connection-info-card">
                            <h6 className="mb-3">
                                <i className="fas fa-server me-2"></i>
                                Target Machine Information
                            </h6>
                            <div className="row">
                                <div className="col-md-6 mb-2">
                                    <strong>Name:</strong> 
                                    <span className="machine-info-badge ms-2">{machine.name}</span>
                                </div>
                                <div className="col-md-6 mb-2">
                                    <strong>IP Address:</strong> 
                                    <code className="ms-2 bg-light px-2 py-1 rounded">{machine.ip_address}</code>
                                </div>
                                <div className="col-md-6 mb-2">
                                    <strong>Username:</strong> 
                                    <code className="ms-2 bg-light px-2 py-1 rounded">{machine.username || 'Not specified'}</code>
                                </div>
                                <div className="col-md-6 mb-2">
                                    <strong>Status:</strong> 
                                    <Badge 
                                        bg={machine.is_active ? 'success' : 'danger'} 
                                        className={`ms-2 ${machine.is_active ? 'connection-status-online' : 'connection-status-offline'}`}
                                    >
                                        <i className={`fas ${machine.is_active ? 'fa-circle' : 'fa-times-circle'} me-1`}></i>
                                        {machine.is_active ? 'Online' : 'Offline'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label>
                                <i className="fas fa-plug me-2"></i>
                                Connection Method
                            </Form.Label>
                            <Form.Select 
                                value={connectionMethod} 
                                onChange={(e) => setConnectionMethod(e.target.value)}
                                disabled={isConnecting || isConnected}
                            >
                                <option value="rdp">🖥️ Remote Desktop (RDP) - Windows</option>
                                <option value="ssh">💻 SSH Terminal - Linux/Unix</option>
                                <option value="vnc">👁️ VNC Viewer - Cross-platform</option>
                                <option value="web">🌐 Web Remote Access (Coming Soon)</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Choose the appropriate remote access method for your target system.
                            </Form.Text>
                        </Form.Group>

                        <div className="connection-method-card">
                            <h6 className="mb-2">
                                <i className={`${getConnectionMethodIcon(connectionMethod)} me-2`}></i>
                                {getConnectionMethodName(connectionMethod)}
                            </h6>
                            <div className="small text-muted">
                                {connectionMethod === 'rdp' && (
                                    <>
                                        <p className="mb-1">• Downloads an RDP file that opens with your default RDP client</p>
                                        <p className="mb-1">• Requires Remote Desktop to be enabled on the target Windows machine</p>
                                        <p className="mb-0">• Default port: 3389</p>
                                    </>
                                )}
                                {connectionMethod === 'ssh' && (
                                    <>
                                        <p className="mb-1">• Copies SSH command to clipboard for terminal use</p>
                                        <p className="mb-1">• Requires SSH server running on target machine</p>
                                        <p className="mb-0">• Default port: 22</p>
                                    </>
                                )}
                                {connectionMethod === 'vnc' && (
                                    <>
                                        <p className="mb-1">• Opens VNC viewer with target machine address</p>
                                        <p className="mb-1">• Requires VNC Server running on target machine</p>
                                        <p className="mb-0">• Default port: 5900</p>
                                    </>
                                )}
                                {connectionMethod === 'web' && (
                                    <>
                                        <p className="mb-0">• Browser-based remote access (under development)</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {!machine.is_active && (
                            <Alert variant="warning" className="mb-3">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Warning: The target machine appears to be offline. Remote access may not work until the machine is powered on and accessible.
                            </Alert>
                        )}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    <i className="fas fa-times me-2"></i>
                    Close
                </Button>
                {isConnected ? (
                    <Button variant="danger" onClick={handleDisconnect}>
                        <i className="fas fa-plug me-2"></i>
                        Disconnect
                    </Button>
                ) : (
                    <Button 
                        variant="primary" 
                        onClick={handleConnect}
                        disabled={isConnecting || !machine}
                    >
                        {isConnecting ? (
                            <>
                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                Connecting...
                            </>
                        ) : (
                            <>
                                <i className={`${getConnectionMethodIcon(connectionMethod)} me-2`}></i>
                                Connect via {getConnectionMethodName(connectionMethod)}
                            </>
                        )}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default RemoteAccessModal;
