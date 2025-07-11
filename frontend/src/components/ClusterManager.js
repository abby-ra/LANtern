import React, { useState } from 'react';
import { Modal, Button, Form, Table, Alert, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

const ClusterManager = ({ show, onHide, machines, onClusterCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

    const handleMachineSelect = (machineId, isSelected) => {
        setSelectedMachines(prev =>
            isSelected
                ? [...prev, machineId]
                : prev.filter(id => id !== machineId)
        );
    };

    const handleSubmit = async () => {
        try {
            await axios.post('/api/clusters', {
                name,
                description,
                machineIds: selectedMachines
            });
            onClusterCreated();
            onHide();
            setAlert({ show: true, message: 'Cluster created successfully', variant: 'success' });
        } catch (err) {
            setAlert({ show: true, message: 'Failed to create cluster', variant: 'danger' });
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Create New Cluster</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {alert.show && (
                    <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
                        {alert.message}
                    </Alert>
                )}
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Cluster Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Select Machines</Form.Label>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Name</th>
                                    <th>IP Address</th>
                                    <th>MAC Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {machines.map(machine => (
                                    <tr key={machine.id}>
                                        <td>
                                            <Form.Check
                                                type="checkbox"
                                                onChange={e => handleMachineSelect(machine.id, e.target.checked)}
                                            />
                                        </td>
                                        <td>{machine.name}</td>
                                        <td>{machine.ip_address}</td>
                                        <td>{machine.mac_address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Create Cluster
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ClusterManager;