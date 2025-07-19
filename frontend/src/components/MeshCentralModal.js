import React, { useState, useEffect } from 'react';
import { Modal, Alert, Badge, Button, Form, Spinner, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const MeshCentralModal = ({ show, onHide, machine }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [isConnecting, setIsConnecting] = useState(false);
    const [meshConfig, setMeshConfig] = useState({
        serverUrl: 'https://meshcentral.example.com',
        username: '',
        password: '',
        domain: 'default'
    });
    const [activeTab, setActiveTab] = useState('connect');
    const [meshNodes, setMeshNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [meshStatus, setMeshStatus] = useState('disconnected');

    // Load saved MeshCentral configuration
    useEffect(() => {
        if (show) {
            const savedConfig = localStorage.getItem('meshcentral_config');
            if (savedConfig) {
                setMeshConfig(JSON.parse(savedConfig));
            }
        }
    }, [show]);

    // Reset modal state when closed
    useEffect(() => {
        if (!show) {
            setIsConnecting(false);
            setAlert({ show: false, message: '', variant: 'success' });
            setMeshStatus('disconnected');
            setSelectedNode(null);
        }
    }, [show]);

    // Save configuration to localStorage
    const saveConfiguration = () => {
        localStorage.setItem('meshcentral_config', JSON.stringify(meshConfig));
        setAlert({ 
            show: true, 
            message: 'MeshCentral configuration saved successfully!', 
            variant: 'success' 
        });
    };

    // Connect to MeshCentral server
    const connectToMeshCentral = async () => {
        setIsConnecting(true);
        try {
            // Connect to MeshCentral server via backend API
            const response = await axios.post(`${API_BASE_URL}/meshcentral/connect`, {
                serverUrl: meshConfig.serverUrl,
                username: meshConfig.username,
                password: meshConfig.password,
                domain: meshConfig.domain
            });

            if (response.data.success) {
                // Fetch nodes for the current machine
                const nodesResponse = await axios.post(`${API_BASE_URL}/meshcentral/nodes`, {
                    serverUrl: meshConfig.serverUrl,
                    sessionId: response.data.sessionId,
                    machineId: machine?.id
                });
                
                setMeshNodes(nodesResponse.data.nodes || []);
                setMeshStatus('connected');
                setAlert({ 
                    show: true, 
                    message: `Connected to MeshCentral server successfully! Found ${nodesResponse.data.nodes?.length || 0} node(s).`, 
                    variant: 'success' 
                });
            } else {
                throw new Error('Connection failed');
            }
            
        } catch (error) {
            console.error('MeshCentral connection failed:', error);
            setAlert({ 
                show: true, 
                message: `Failed to connect to MeshCentral: ${error.response?.data?.details || error.message}`, 
                variant: 'danger' 
            });
            setMeshStatus('error');
        } finally {
            setIsConnecting(false);
        }
    };

    // Launch remote desktop session
    const launchRemoteDesktop = async (node) => {
        if (!node) return;
        
        try {
            setAlert({ 
                show: true, 
                message: `Launching remote desktop session for ${node.name}...`, 
                variant: 'info' 
            });

            // Create remote session via backend API
            const response = await axios.post(`${API_BASE_URL}/meshcentral/remote-session`, {
                nodeId: node.id,
                sessionType: 'desktop',
                machineId: machine?.id
            });

            if (response.data.success) {
                // Open the session URL in a new window
                window.open(response.data.sessionUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                setAlert({ 
                    show: true, 
                    message: `Remote desktop session opened for ${node.name}`, 
                    variant: 'success' 
                });
            } else {
                throw new Error('Failed to create session');
            }
        } catch (error) {
            console.error('Failed to launch remote desktop:', error);
            setAlert({ 
                show: true, 
                message: `Failed to launch remote desktop: ${error.response?.data?.details || error.message}`, 
                variant: 'danger' 
            });
        }
    };

    // Launch terminal session
    const launchTerminal = async (node) => {
        if (!node) return;
        
        try {
            setAlert({ 
                show: true, 
                message: `Launching terminal session for ${node.name}...`, 
                variant: 'info' 
            });

            const response = await axios.post(`${API_BASE_URL}/meshcentral/remote-session`, {
                nodeId: node.id,
                sessionType: 'terminal',
                machineId: machine?.id
            });

            if (response.data.success) {
                window.open(response.data.sessionUrl, '_blank', 'width=1000,height=600,scrollbars=yes,resizable=yes');
                setAlert({ 
                    show: true, 
                    message: `Terminal session opened for ${node.name}`, 
                    variant: 'success' 
                });
            } else {
                throw new Error('Failed to create session');
            }
        } catch (error) {
            console.error('Failed to launch terminal:', error);
            setAlert({ 
                show: true, 
                message: `Failed to launch terminal: ${error.response?.data?.details || error.message}`, 
                variant: 'danger' 
            });
        }
    };

    // Launch file manager
    const launchFileManager = async (node) => {
        if (!node) return;
        
        try {
            setAlert({ 
                show: true, 
                message: `Launching file manager for ${node.name}...`, 
                variant: 'info' 
            });

            const response = await axios.post(`${API_BASE_URL}/meshcentral/remote-session`, {
                nodeId: node.id,
                sessionType: 'files',
                machineId: machine?.id
            });

            if (response.data.success) {
                window.open(response.data.sessionUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                setAlert({ 
                    show: true, 
                    message: `File manager opened for ${node.name}`, 
                    variant: 'success' 
                });
            } else {
                throw new Error('Failed to create session');
            }
        } catch (error) {
            console.error('Failed to launch file manager:', error);
            setAlert({ 
                show: true, 
                message: `Failed to launch file manager: ${error.response?.data?.details || error.message}`, 
                variant: 'danger' 
            });
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'online':
                return <Badge bg="success"><i className="fas fa-circle me-1"></i>Online</Badge>;
            case 'offline':
                return <Badge bg="danger"><i className="fas fa-circle me-1"></i>Offline</Badge>;
            default:
                return <Badge bg="secondary"><i className="fas fa-circle me-1"></i>Unknown</Badge>;
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="meshcentral-modal">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="fas fa-network-wired me-2"></i>
                    MeshCentral Remote Access - {machine?.name}
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

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                    <Tab eventKey="connect" title={
                        <>
                            <i className="fas fa-plug me-2"></i>
                            Connection
                        </>
                    }>
                        <div className="mb-4">
                            <h6 className="mb-3">
                                <i className="fas fa-server me-2"></i>
                                MeshCentral Server Configuration
                            </h6>
                            
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Server URL</Form.Label>
                                    <Form.Control
                                        type="url"
                                        value={meshConfig.serverUrl}
                                        onChange={(e) => setMeshConfig({...meshConfig, serverUrl: e.target.value})}
                                        placeholder="https://meshcentral.example.com"
                                    />
                                    <Form.Text className="text-muted">
                                        Enter your MeshCentral server URL
                                    </Form.Text>
                                </Form.Group>

                                <div className="row">
                                    <div className="col-md-6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Username</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={meshConfig.username}
                                                onChange={(e) => setMeshConfig({...meshConfig, username: e.target.value})}
                                                placeholder="admin"
                                            />
                                        </Form.Group>
                                    </div>
                                    <div className="col-md-6">
                                        <Form.Group className="mb-3">
                                            <Form.Label>Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={meshConfig.password}
                                                onChange={(e) => setMeshConfig({...meshConfig, password: e.target.value})}
                                                placeholder="••••••••"
                                            />
                                        </Form.Group>
                                    </div>
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label>Domain</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={meshConfig.domain}
                                        onChange={(e) => setMeshConfig({...meshConfig, domain: e.target.value})}
                                        placeholder="default"
                                    />
                                    <Form.Text className="text-muted">
                                        MeshCentral domain (usually 'default')
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-flex gap-2">
                                    <Button variant="outline-primary" onClick={saveConfiguration}>
                                        <i className="fas fa-save me-2"></i>
                                        Save Configuration
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        onClick={connectToMeshCentral}
                                        disabled={isConnecting || !meshConfig.serverUrl}
                                    >
                                        {isConnecting ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-plug me-2"></i>
                                                Connect to MeshCentral
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    </Tab>

                    <Tab eventKey="nodes" title={
                        <>
                            <i className="fas fa-desktop me-2"></i>
                            Nodes {meshNodes.length > 0 && `(${meshNodes.length})`}
                        </>
                    } disabled={meshStatus !== 'connected'}>
                        {meshStatus === 'connected' && (
                            <div>
                                <h6 className="mb-3">
                                    <i className="fas fa-list me-2"></i>
                                    Available Mesh Nodes
                                </h6>

                                {meshNodes.length === 0 ? (
                                    <Alert variant="info">
                                        <i className="fas fa-info-circle me-2"></i>
                                        No mesh nodes found. Make sure MeshAgent is installed on target machines.
                                    </Alert>
                                ) : (
                                    <div className="row">
                                        {meshNodes.map(node => (
                                            <div key={node.id} className="col-md-12 mb-3">
                                                <div className="card">
                                                    <div className="card-body">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div>
                                                                <h6 className="card-title mb-2">
                                                                    <i className="fas fa-desktop me-2"></i>
                                                                    {node.name}
                                                                </h6>
                                                                <div className="mb-2">
                                                                    <small className="text-muted">
                                                                        <strong>IP:</strong> <code>{node.ip}</code> | 
                                                                        <strong> Platform:</strong> {node.platform} | 
                                                                        <strong> Last Seen:</strong> {new Date(node.lastSeen).toLocaleString()}
                                                                    </small>
                                                                </div>
                                                                <div className="mb-2">
                                                                    {getStatusBadge(node.status)}
                                                                </div>
                                                            </div>
                                                            <div className="d-flex gap-2">
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="primary"
                                                                    onClick={() => launchRemoteDesktop(node)}
                                                                    disabled={node.status !== 'online'}
                                                                >
                                                                    <i className="fas fa-desktop me-1"></i>
                                                                    Desktop
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="info"
                                                                    onClick={() => launchTerminal(node)}
                                                                    disabled={node.status !== 'online'}
                                                                >
                                                                    <i className="fas fa-terminal me-1"></i>
                                                                    Terminal
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="success"
                                                                    onClick={() => launchFileManager(node)}
                                                                    disabled={node.status !== 'online'}
                                                                >
                                                                    <i className="fas fa-folder me-1"></i>
                                                                    Files
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Tab>
                </Tabs>

                {machine && (
                    <div className="mt-3 p-3 bg-light rounded">
                        <h6 className="mb-2">
                            <i className="fas fa-info-circle me-2"></i>
                            Target Machine Information
                        </h6>
                        <div className="row">
                            <div className="col-md-4">
                                <strong>Name:</strong> {machine.name}
                            </div>
                            <div className="col-md-4">
                                <strong>IP Address:</strong> <code>{machine.ip_address}</code>
                            </div>
                            <div className="col-md-4">
                                <strong>Status:</strong> {' '}
                                <Badge bg={machine.is_active ? 'success' : 'danger'}>
                                    {machine.is_active ? 'Online' : 'Offline'}
                                </Badge>
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
                {meshStatus === 'connected' && selectedNode && (
                    <Button variant="primary" onClick={() => launchRemoteDesktop(selectedNode)}>
                        <i className="fas fa-desktop me-2"></i>
                        Connect to Selected Node
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default MeshCentralModal;
