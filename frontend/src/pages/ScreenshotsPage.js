import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Alert, Form, Spinner, Table } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const ScreenshotsPage = () => {
    const [screenshots, setScreenshots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ show: false, message: '', variant: 'info' });
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedScreenshot, setSelectedScreenshot] = useState(null);
    const [cleanupDays, setCleanupDays] = useState(7);
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    useEffect(() => {
        fetchScreenshots();
    }, []);

    const fetchScreenshots = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/screenshots`);
            setScreenshots(response.data.screenshots);
        } catch (error) {
            console.error('Failed to fetch screenshots:', error);
            showAlert('Failed to fetch screenshots', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (message, variant = 'info') => {
        setAlert({ show: true, message, variant });
        setTimeout(() => setAlert({ show: false, message: '', variant: 'info' }), 5000);
    };

    const handlePreviewScreenshot = (screenshot) => {
        setSelectedScreenshot(screenshot);
        setShowPreviewModal(true);
    };

    const handleDeleteScreenshot = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/screenshots/${filename}`);
            showAlert(`Screenshot ${filename} deleted successfully`, 'success');
            fetchScreenshots(); // Refresh list
        } catch (error) {
            console.error('Failed to delete screenshot:', error);
            showAlert('Failed to delete screenshot', 'danger');
        }
    };

    const handleCleanupOldScreenshots = async () => {
        if (!window.confirm(`Are you sure you want to delete all screenshots older than ${cleanupDays} days?`)) {
            return;
        }

        try {
            setIsCleaningUp(true);
            const response = await axios.post(`${API_BASE_URL}/screenshots/cleanup`, {
                days: cleanupDays
            });
            showAlert(response.data.message, 'success');
            fetchScreenshots(); // Refresh list
        } catch (error) {
            console.error('Failed to cleanup screenshots:', error);
            showAlert('Failed to cleanup old screenshots', 'danger');
        } finally {
            setIsCleaningUp(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>
                            <i className="fas fa-camera me-2"></i>
                            Screenshot Manager
                        </h2>
                        <div className="d-flex gap-2 align-items-center">
                            <Form.Control
                                type="number"
                                min="1"
                                max="365"
                                value={cleanupDays}
                                onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                                style={{ width: '80px' }}
                                title="Days to keep screenshots"
                            />
                            <Button 
                                variant="warning"
                                onClick={handleCleanupOldScreenshots}
                                disabled={isCleaningUp}
                            >
                                {isCleaningUp ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Cleaning...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-broom me-2"></i>
                                        Cleanup Old ({cleanupDays}d+)
                                    </>
                                )}
                            </Button>
                            <Button variant="primary" onClick={fetchScreenshots}>
                                <i className="fas fa-sync-alt me-2"></i>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {alert.show && (
                <Alert variant={alert.variant} dismissible onClose={() => setAlert({ show: false, message: '', variant: 'info' })}>
                    {alert.message}
                </Alert>
            )}

            {loading ? (
                <div className="text-center">
                    <Spinner animation="border" />
                    <p>Loading screenshots...</p>
                </div>
            ) : (
                <>
                    <Row className="mb-3">
                        <Col>
                            <Badge bg="info" className="me-2">
                                Total Screenshots: {screenshots.length}
                            </Badge>
                            <Badge bg="secondary">
                                Total Size: {formatFileSize(screenshots.reduce((total, s) => total + s.size, 0))}
                            </Badge>
                        </Col>
                    </Row>

                    {screenshots.length === 0 ? (
                        <Card>
                            <Card.Body className="text-center py-5">
                                <i className="fas fa-camera fa-3x text-muted mb-3"></i>
                                <h4>No Screenshots Found</h4>
                                <p className="text-muted">
                                    Screenshots will appear here when you use the Visual Remote Desktop Viewer
                                    or when machines are monitored.
                                </p>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Card>
                            <Card.Header>
                                <h5 className="mb-0">
                                    <i className="fas fa-images me-2"></i>
                                    Saved Screenshots
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <Table responsive striped hover className="mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Preview</th>
                                            <th>Machine</th>
                                            <th>Filename</th>
                                            <th>Size</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {screenshots.map((screenshot, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <img
                                                        src={`${API_BASE_URL}${screenshot.url}`}
                                                        alt={screenshot.filename}
                                                        style={{ 
                                                            width: '60px', 
                                                            height: '40px', 
                                                            objectFit: 'cover',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => handlePreviewScreenshot(screenshot)}
                                                        className="border rounded"
                                                    />
                                                </td>
                                                <td>
                                                    <strong>{screenshot.machineName}</strong>
                                                </td>
                                                <td>
                                                    <code>{screenshot.filename}</code>
                                                </td>
                                                <td>{formatFileSize(screenshot.size)}</td>
                                                <td>{formatDate(screenshot.created)}</td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="info"
                                                            onClick={() => handlePreviewScreenshot(screenshot)}
                                                            title="Preview"
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            as="a"
                                                            href={`${API_BASE_URL}${screenshot.url}`}
                                                            download={screenshot.filename}
                                                            title="Download"
                                                        >
                                                            <i className="fas fa-download"></i>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => handleDeleteScreenshot(screenshot.filename)}
                                                            title="Delete"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}
                </>
            )}

            {/* Screenshot Preview Modal */}
            <Modal 
                show={showPreviewModal} 
                onHide={() => setShowPreviewModal(false)} 
                size="xl"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-image me-2"></i>
                        Screenshot Preview - {selectedScreenshot?.machineName}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedScreenshot && (
                        <div className="text-center">
                            <img
                                src={`${API_BASE_URL}${selectedScreenshot.url}`}
                                alt={selectedScreenshot.filename}
                                className="img-fluid border rounded"
                                style={{ maxHeight: '70vh' }}
                            />
                            <div className="mt-3">
                                <div className="row">
                                    <div className="col-md-6">
                                        <strong>Machine:</strong> {selectedScreenshot.machineName}<br/>
                                        <strong>Filename:</strong> <code>{selectedScreenshot.filename}</code>
                                    </div>
                                    <div className="col-md-6">
                                        <strong>Size:</strong> {formatFileSize(selectedScreenshot.size)}<br/>
                                        <strong>Created:</strong> {formatDate(selectedScreenshot.created)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="success"
                        as="a"
                        href={selectedScreenshot ? `${API_BASE_URL}${selectedScreenshot.url}` : '#'}
                        download={selectedScreenshot?.filename}
                    >
                        <i className="fas fa-download me-2"></i>
                        Download
                    </Button>
                    <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ScreenshotsPage;
