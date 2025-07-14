import React, { useState } from 'react';
import { Card, Alert, Badge, Dropdown, DropdownButton } from 'react-bootstrap';
import './animations.css';

const ClusterCard = ({ cluster, onClusterAction, onEdit, onDelete }) => {
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

    const handleAction = async (action) => {
        try {
            const success = await onClusterAction(cluster.id, action);
            if (success) {
                setAlert({ show: true, message: `${action} command sent to cluster successfully! 🎉`, variant: 'success' });
            } else {
                setAlert({ show: true, message: `Failed to ${action} cluster. Please try again.`, variant: 'danger' });
            }
            setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
        } catch (err) {
            setAlert({ show: true, message: `Failed to ${action} cluster`, variant: 'danger' });
            setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
        }
    };

    return (
        <>
            <Card className="h-100 shadow-sm border-0 cluster-card">
                <Card.Body className="d-flex flex-column">
                    {alert.show && (
                        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible className="mb-3">
                            {alert.message}
                        </Alert>
                    )}
                    
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <h5 className="card-title mb-0 text-primary fw-bold">
                                <i className="fas fa-layer-group me-2"></i>
                                {cluster.name}
                            </h5>
                            <Badge bg="light" text="dark" className="fs-6">
                                {cluster.machine_count} machines
                            </Badge>
                        </div>
                        <p className="card-text text-muted mb-0">{cluster.description}</p>
                    </div>
                    
                    <div className="mt-auto">
                        <div className="d-flex justify-content-center">
                            <DropdownButton
                                id={`cluster-actions-${cluster.id}`}
                                title={
                                    <>
                                        <i className="fas fa-cog me-2"></i>
                                        Actions
                                    </>
                                }
                                variant="outline-primary"
                                size="sm"
                                style={{ minWidth: '150px' }}
                                menuAlign="center"
                                drop="down"
                            >
                                <Dropdown.Item 
                                    onClick={() => handleAction('wake')}
                                    className="text-success"
                                >
                                    <i className="fas fa-play me-2"></i>Start
                                </Dropdown.Item>
                                <Dropdown.Item 
                                    onClick={() => handleAction('restart')}
                                    className="text-warning"
                                >
                                    <i className="fas fa-redo me-2"></i>Restart
                                </Dropdown.Item>
                                <Dropdown.Item 
                                    onClick={() => handleAction('shutdown')}
                                    className="text-danger"
                                >
                                    <i className="fas fa-power-off me-2"></i>Shutdown
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                    onClick={() => onEdit(cluster)}
                                    className="text-info"
                                >
                                    <i className="fas fa-edit me-2"></i>Edit
                                </Dropdown.Item>
                                <Dropdown.Item 
                                    onClick={() => onDelete(cluster.id)}
                                    className="text-danger"
                                >
                                    <i className="fas fa-trash me-2"></i>Delete
                                </Dropdown.Item>
                            </DropdownButton>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </>
    );
};

export default ClusterCard;