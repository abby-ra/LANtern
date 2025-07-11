import React, { useState } from 'react';
import { Card, Button, Modal, Form, Alert } from 'react-bootstrap';

const ClusterCard = ({ cluster, onClusterAction, onDelete }) => {
    const [showActionModal, setShowActionModal] = useState(false);
    const [action, setAction] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

    const handleAction = async () => {
        try {
            await onClusterAction(cluster.id, action);
            setShowActionModal(false);
            setAlert({ show: true, message: `${action} command sent to cluster`, variant: 'success' });
            setTimeout(() => setAlert({ ...alert, show: false }), 3000);
        } catch (err) {
            setAlert({ show: true, message: `Failed to ${action} cluster`, variant: 'danger' });
        }
    };

    return (
        <>
            <Card className="mb-3">
                <Card.Body>
                    {alert.show && (
                        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
                            {alert.message}
                        </Alert>
                    )}
                    <Card.Title>{cluster.name}</Card.Title>
                    <Card.Text>{cluster.description}</Card.Text>
                    <Card.Text>
                        <small className="text-muted">
                            {cluster.machine_count} machines in cluster
                        </small>
                    </Card.Text>
                    <div className="d-flex justify-content-between">
                        <div>
                            <Button
                                variant="success"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                    setAction('wake');
                                    setShowActionModal(true);
                                }}
                            >
                                <i className="fas fa-power-off"></i> Start
                            </Button>
                            <Button
                                variant="warning"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                    setAction('restart');
                                    setShowActionModal(true);
                                }}
                            >
                                <i className="fas fa-redo"></i> Restart
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                    setAction('shutdown');
                                    setShowActionModal(true);
                                }}
                            >
                                <i className="fas fa-power-off"></i> Shutdown
                            </Button>
                        </div>
                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDelete(cluster.id)}
                        >
                            <i className="fas fa-trash"></i>
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            <Modal show={showActionModal} onHide={() => setShowActionModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm {action.charAt(0).toUpperCase() + action.slice(1)}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Are you sure you want to {action} the cluster "{cluster.name}"?
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowActionModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleAction}>
                        Confirm
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ClusterCard;