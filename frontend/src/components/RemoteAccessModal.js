import React, { useState, useEffect, useRef } from 'react';
import { Modal, Alert, Badge, Button, Form, Tab, Tabs } from 'react-bootstrap';
import './animations.css';

const RemoteAccessModal = ({ show, onHide, machine }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionMethod, setConnectionMethod] = useState('web-rdp');
    const [activeTab, setActiveTab] = useState('connect');
    const [remoteViewUrl, setRemoteViewUrl] = useState('');
    const [connectionDetails, setConnectionDetails] = useState(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!show) {
            setIsConnected(false);
            setIsConnecting(false);
            setRemoteViewUrl('');
            setActiveTab('connect');
            setConnectionDetails(null);
            setAlert({ show: false, message: '', variant: 'success' });
        }
    }, [show]);

    const handleConnect = async () => {
        if (!machine) return;
        
        setIsConnecting(true);
        try {
            // Call backend to prepare remote connection
            const response = await fetch(`http://localhost:3001/api/machines/${machine.id}/remote-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    protocol: connectionMethod,
                    port: null // Use default port
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to prepare remote connection');
            }
            
            const result = await response.json();
            
            if (result.success) {
                setRemoteViewUrl(result.connectionUrl);
                setConnectionDetails(result.connectionDetails);
                setActiveTab('remote-view');
                setIsConnected(true);
                
                const alertVariant = result.warning ? 'warning' : 'info';
                const message = result.warning ? 
                    `${result.warning} Attempting connection to ${machine.name}...` :
                    `Establishing ${result.connectionDetails.protocol} connection to ${machine.name}...`;
                    
                setAlert({ 
                    show: true, 
                    message, 
                    variant: alertVariant 
                });
            } else {
                throw new Error('Backend failed to prepare connection');
            }
            
        } catch (error) {
            console.error('Connection failed:', error);
            setAlert({ 
                show: true, 
                message: `Failed to establish connection: ${error.message}. Please ensure the target machine is running the required remote access services.`, 
                variant: 'danger' 
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setRemoteViewUrl('');
        setActiveTab('connect');
        setConnectionDetails(null);
        setAlert({ 
            show: true, 
            message: 'Disconnected from remote machine', 
            variant: 'info' 
        });
    };

    const handleFullscreen = () => {
        if (iframeRef.current) {
            if (iframeRef.current.requestFullscreen) {
                iframeRef.current.requestFullscreen();
            } else if (iframeRef.current.webkitRequestFullscreen) {
                iframeRef.current.webkitRequestFullscreen();
            } else if (iframeRef.current.mozRequestFullScreen) {
                iframeRef.current.mozRequestFullScreen();
            }
        }
    };

    const generateAndDownloadRDP = () => {
        const rdpContent = `full address:s:${machine.ip_address}:3389
username:s:${machine.username || 'administrator'}
screen mode id:i:2
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
compression:i:1
keyboardhook:i:2
displayconnectionbar:i:1
autoreconnection enabled:i:1
authentication level:i:2
redirectclipboard:i:1
redirectprinters:i:1
redirectsmartcards:i:1`;

        const blob = new Blob([rdpContent], { type: 'application/rdp' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${machine.name}-remote.rdp`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setAlert({ 
            show: true, 
            message: `RDP file downloaded for ${machine.name}. Open it with your RDP client.`, 
            variant: 'success' 
        });
    };

    const getConnectionMethodIcon = (method) => {
        switch (method) {
            case 'web-rdp': return 'fas fa-globe';
            case 'web-vnc': return 'fas fa-eye';
            case 'embedded-ssh': return 'fas fa-terminal';
            case 'html5-rdp': return 'fas fa-desktop';
            default: return 'fas fa-plug';
        }
    };

    const getConnectionMethodName = (method) => {
        switch (method) {
            case 'web-rdp': return 'Web-based Remote Desktop';
            case 'web-vnc': return 'Web-based VNC Viewer';
            case 'embedded-ssh': return 'Web SSH Terminal';
            case 'html5-rdp': return 'HTML5 Remote Desktop';
            default: return 'Unknown';
        }
    };

    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            size="xl" 
            className="remote-access-modal"
            backdrop={activeTab === 'remote-view' ? 'static' : true}
            keyboard={activeTab !== 'remote-view'}
            fullscreen={activeTab === 'remote-view' ? 'lg-down' : false}
        >
            <Modal.Header closeButton>
                <Modal.Title className="d-flex align-items-center">
                    <i className="fas fa-desktop me-3"></i>
                    Full Machine Access - {machine?.name || 'Unknown Machine'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ minHeight: activeTab === 'remote-view' ? '80vh' : 'auto' }}>
                {alert.show && (
                    <Alert variant={alert.variant} className="mb-3" dismissible onClose={() => setAlert({ ...alert, show: false })}>
                        {alert.message}
                    </Alert>
                )}

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                    <Tab eventKey="connect" title={<><i className="fas fa-plug me-2"></i>Connect</>}>
                        <div className="connection-info-card">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <h5 className="mb-2">
                                        <i className="fas fa-server me-2"></i>
                                        {machine?.name || 'Unknown Machine'}
                                    </h5>
                                    <div className="d-flex flex-wrap gap-2 mb-2">
                                        <Badge className="machine-info-badge">
                                            <i className="fas fa-network-wired me-1"></i>
                                            {machine?.ip_address || 'Unknown IP'}
                                        </Badge>
                                        <Badge className="machine-info-badge">
                                            <i className="fas fa-microchip me-1"></i>
                                            {machine?.cpu_cores || 'Unknown'} cores
                                        </Badge>
                                        <Badge className="machine-info-badge">
                                            <i className="fas fa-memory me-1"></i>
                                            {machine?.ram_gb || 'Unknown'} GB RAM
                                        </Badge>
                                        <Badge className="machine-info-badge">
                                            <i className="fas fa-hdd me-1"></i>
                                            {machine?.storage_gb || 'Unknown'} GB Storage
                                        </Badge>
                                    </div>
                                    <p className="text-muted mb-0">
                                        <i className={`fas fa-circle me-1 ${machine?.status === 'active' ? 'connection-status-online' : 'connection-status-offline'}`}></i>
                                        Status: <strong>{machine?.status || 'Unknown'}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="connection-method-card">
                            <h6 className="mb-3">
                                <i className="fas fa-cog me-2"></i>
                                Select Full Access Method
                            </h6>
                            <Form.Group className="mb-3">
                                <Form.Label>Remote Access Protocol</Form.Label>
                                <Form.Select 
                                    value={connectionMethod} 
                                    onChange={(e) => setConnectionMethod(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="web-rdp">🖥️ Web-based Remote Desktop (Full Screen Access)</option>
                                    <option value="html5-rdp">🌐 HTML5 Remote Desktop (Browser Native)</option>
                                    <option value="web-vnc">👁️ Web-based VNC Viewer (Cross-platform)</option>
                                    <option value="embedded-ssh">💻 Web SSH Terminal (Command Line)</option>
                                </Form.Select>
                            </Form.Group>
                            
                            <div className="alert alert-info">
                                <i className={`${getConnectionMethodIcon(connectionMethod)} me-2`}></i>
                                <strong>{getConnectionMethodName(connectionMethod)}</strong>
                                <br />
                                <small>
                                    {connectionMethod === 'web-rdp' && 'Access the complete Windows desktop directly in your browser with full keyboard and mouse control.'}
                                    {connectionMethod === 'html5-rdp' && 'Native browser RDP client - no plugins needed, full desktop experience.'}
                                    {connectionMethod === 'web-vnc' && 'Cross-platform screen sharing with full desktop access through your browser.'}
                                    {connectionMethod === 'embedded-ssh' && 'Full terminal access with interactive command-line interface in the browser.'}
                                </small>
                            </div>

                            <div className="d-flex gap-2">
                                <Button 
                                    variant="primary" 
                                    onClick={handleConnect}
                                    disabled={isConnecting || !machine?.ip_address}
                                    className="flex-fill"
                                >
                                    {isConnecting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin me-2"></i>
                                            Establishing Connection...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-desktop me-2"></i>
                                            Access Full Machine
                                        </>
                                    )}
                                </Button>
                                
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={generateAndDownloadRDP}
                                    disabled={!machine?.ip_address}
                                >
                                    <i className="fas fa-download me-2"></i>
                                    Download RDP
                                </Button>
                            </div>
                        </div>
                    </Tab>

                    <Tab 
                        eventKey="remote-view" 
                        title={<><i className="fas fa-desktop me-2"></i>Full Machine Access</> } 
                        disabled={!remoteViewUrl}
                    >
                        {remoteViewUrl && (
                            <div className="remote-desktop-container">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h6 className="mb-0">
                                            <i className="fas fa-desktop me-2"></i>
                                            Full Machine Access - {machine?.name}
                                        </h6>
                                        {connectionDetails && (
                                            <small className="text-muted">
                                                <i className="fas fa-info-circle me-1"></i>
                                                {connectionDetails.description} • Protocol: {connectionDetails.protocol} • Port: {connectionDetails.port}
                                            </small>
                                        )}
                                    </div>
                                    <div className="d-flex gap-2">
                                        <Button size="sm" variant="outline-primary" onClick={handleFullscreen}>
                                            <i className="fas fa-expand me-1"></i>
                                            Fullscreen
                                        </Button>
                                        <Button size="sm" variant="outline-warning" onClick={() => window.open(remoteViewUrl, '_blank')}>
                                            <i className="fas fa-external-link-alt me-1"></i>
                                            New Window
                                        </Button>
                                        <Button size="sm" variant="outline-danger" onClick={handleDisconnect}>
                                            <i className="fas fa-times me-1"></i>
                                            Disconnect
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="remote-desktop-frame position-relative">
                                    <iframe
                                        ref={iframeRef}
                                        src={remoteViewUrl}
                                        width="100%"
                                        height="700px"
                                        style={{
                                            border: '2px solid #3498DB',
                                            borderRadius: '8px',
                                            backgroundColor: '#f8f9fa'
                                        }}
                                        title={`Full Machine Access - ${machine?.name}`}
                                        allow="fullscreen"
                                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                                        onLoad={() => {
                                            setTimeout(() => {
                                                setAlert({ 
                                                    show: true, 
                                                    message: `Successfully connected to ${machine?.name}. You now have full desktop access.`, 
                                                    variant: 'success' 
                                                });
                                            }, 3000);
                                        }}
                                        onError={() => {
                                            setAlert({ 
                                                show: true, 
                                                message: `Connection failed. Please check if the remote services are running on ${machine?.name}.`, 
                                                variant: 'warning' 
                                            });
                                        }}
                                    />
                                    
                                    {/* Connection overlay for initial loading */}
                                    <div 
                                        className="position-absolute top-50 start-50 translate-middle text-center"
                                        style={{ 
                                            zIndex: 1000,
                                            background: 'rgba(255,255,255,0.9)',
                                            padding: '2rem',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        id="connection-loading"
                                    >
                                        <div className="spinner-border text-primary mb-3" role="status"></div>
                                        <h6>Establishing Full Machine Connection</h6>
                                        <p className="text-muted mb-0">
                                            Connecting to {machine?.name} via {connectionDetails?.protocol}...
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-3 text-center">
                                    <div className="alert alert-success">
                                        <i className="fas fa-check-circle me-2"></i>
                                        <strong>Full Machine Access Active</strong> - You can now control {machine?.name} completely through this interface.
                                        Use keyboard shortcuts, mouse controls, and access all desktop applications.
                                    </div>
                                </div>
                            </div>
                        )}
                    </Tab>
                </Tabs>
            </Modal.Body>
            
            <Modal.Footer>
                <div className="d-flex justify-content-between w-100 align-items-center">
                    <div>
                        {machine?.ip_address && (
                            <small className="text-muted">
                                <i className="fas fa-network-wired me-1"></i>
                                Target: {machine.ip_address} | 
                                <i className="fas fa-clock ms-2 me-1"></i>
                                Session: {isConnected ? 'Active' : 'Inactive'}
                            </small>
                        )}
                    </div>
                    <div>
                        <Button variant="secondary" onClick={onHide}>
                            <i className="fas fa-times me-2"></i>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default RemoteAccessModal;
