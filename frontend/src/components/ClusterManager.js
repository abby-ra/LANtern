import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Alert, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const ClusterManager = ({ show, onHide, machines, onClusterCreated, editingCluster = null }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
    const [loading, setLoading] = useState(false);

    const isEditMode = editingCluster !== null;

    // Load cluster data when editing
    useEffect(() => {
        if (isEditMode && editingCluster) {
            setName(editingCluster.name || '');
            setDescription(editingCluster.description || '');
            loadClusterMachines(editingCluster.id);
        } else {
            // Reset form for create mode
            setName('');
            setDescription('');
            setSelectedMachines([]);
        }
    }, [editingCluster, isEditMode]);

    const loadClusterMachines = async (clusterId) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/clusters/${clusterId}`);
            const clusterMachines = response.data.machines || [];
            setSelectedMachines(clusterMachines.map(machine => machine.id));
        } catch (err) {
            console.error('Failed to load cluster machines:', err);
            setAlert({ show: true, message: 'Failed to load cluster data', variant: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleMachineSelect = (machineId, isSelected) => {
        setSelectedMachines(prev =>
            isSelected
                ? [...prev, machineId]
                : prev.filter(id => id !== machineId)
        );
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim()) {
            setAlert({ show: true, message: 'Please enter a cluster name', variant: 'danger' });
            return;
        }
        
        if (selectedMachines.length === 0) {
            setAlert({ show: true, message: 'Please select at least one machine', variant: 'danger' });
            return;
        }

        try {
            setLoading(true);
            if (isEditMode) {
                console.log('Updating cluster with:', { name, description, machineIds: selectedMachines });
                await axios.put(`${API_BASE_URL}/clusters/${editingCluster.id}`, {
                    name,
                    description,
                    machineIds: selectedMachines
                });
            } else {
                console.log('Creating cluster with:', { name, description, machineIds: selectedMachines });
                await axios.post(`${API_BASE_URL}/clusters`, {
                    name,
                    description,
                    machineIds: selectedMachines
                });
            }
            
            onClusterCreated();
            onHide();
            // Reset form
            setName('');
            setDescription('');
            setSelectedMachines([]);
            setAlert({ show: true, message: `Cluster ${isEditMode ? 'updated' : 'created'} successfully`, variant: 'success' });
        } catch (err) {
            console.error(`Cluster ${isEditMode ? 'update' : 'creation'} failed:`, err);
            setAlert({ show: true, message: `Failed to ${isEditMode ? 'update' : 'create'} cluster: ` + (err.response?.data?.error || err.message), variant: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setName('');
        setDescription('');
        setSelectedMachines([]);
        setAlert({ show: false, message: '', variant: 'success' });
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className={`fas ${isEditMode ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
                    {isEditMode ? 'Edit Cluster' : 'Create New Cluster'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {alert.show && (
                    <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
                        {alert.message}
                    </Alert>
                )}
                
                {loading && (
                    <div className="text-center py-3">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}
                
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>
                            <i className="fas fa-tag me-2"></i>
                            Cluster Name *
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter cluster name"
                            disabled={loading}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>
                            <i className="fas fa-align-left me-2"></i>
                            Description
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter cluster description (optional)"
                            disabled={loading}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>
                            <i className="fas fa-desktop me-2"></i>
                            Select Machines *
                        </Form.Label>
                        <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <Table striped hover size="sm" className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th width="50">
                                            <Form.Check
                                                type="checkbox"
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedMachines(machines.map(machine => machine.id));
                                                    } else {
                                                        setSelectedMachines([]);
                                                    }
                                                }}
                                                checked={selectedMachines.length === machines.length && machines.length > 0}
                                                disabled={loading}
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>IP Address</th>
                                        <th>MAC Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {machines.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted py-3">
                                                <i className="fas fa-info-circle me-2"></i>
                                                No machines available. Please add machines first.
                                            </td>
                                        </tr>
                                    ) : (
                                        machines.map(machine => (
                                            <tr key={machine.id}>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={selectedMachines.includes(machine.id)}
                                                        onChange={e => handleMachineSelect(machine.id, e.target.checked)}
                                                        disabled={loading}
                                                    />
                                                </td>
                                                <td>
                                                    <i className="fas fa-desktop me-2 text-primary"></i>
                                                    {machine.name}
                                                </td>
                                                <td className="font-monospace">{machine.ip_address}</td>
                                                <td className="font-monospace text-muted">{machine.mac_address}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                        {selectedMachines.length > 0 && (
                            <div className="mt-2 text-muted small">
                                <i className="fas fa-check-circle text-success me-2"></i>
                                {selectedMachines.length} machine{selectedMachines.length > 1 ? 's' : ''} selected
                            </div>
                        )}
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={loading}>
                    <i className="fas fa-times me-2"></i>
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleSubmit} 
                    disabled={loading || machines.length === 0}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            {isEditMode ? 'Updating...' : 'Creating...'}
                        </>
                    ) : (
                        <>
                            <i className={`fas ${isEditMode ? 'fa-save' : 'fa-plus-circle'} me-2`}></i>
                            {isEditMode ? 'Update Cluster' : 'Create Cluster'}
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ClusterManager;