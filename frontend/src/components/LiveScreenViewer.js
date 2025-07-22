import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Spinner, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const LiveScreenViewer = ({ machineId, machineName, machineIp, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [quality, setQuality] = useState(5);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(2000);
    const [screenshotCount, setScreenshotCount] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const imgRef = useRef(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        startLiveViewing();
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [machineId]);

    useEffect(() => {
        if (autoRefresh) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
        return () => stopAutoRefresh();
    }, [autoRefresh, refreshInterval]);

    const startLiveViewing = () => {
        setConnectionStatus('connecting');
        setError(null);
        fetchScreenshot();
    };

    const startAutoRefresh = () => {
        stopAutoRefresh();
        intervalRef.current = setInterval(() => {
            fetchScreenshot();
        }, refreshInterval);
    };

    const stopAutoRefresh = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const fetchScreenshot = async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/machines/screenshot/${machineId}`,
                {
                    responseType: 'blob',
                    timeout: 10000,
                    params: {
                        quality: quality,
                        timestamp: Date.now() // Force fresh screenshot
                    }
                }
            );

            if (response.status === 200) {
                const imageUrl = URL.createObjectURL(response.data);
                
                if (imgRef.current) {
                    // Clean up previous object URL
                    if (imgRef.current.src.startsWith('blob:')) {
                        URL.revokeObjectURL(imgRef.current.src);
                    }
                    imgRef.current.src = imageUrl;
                }

                setIsLoading(false);
                setError(null);
                setConnectionStatus('connected');
                setScreenshotCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Screenshot fetch error:', err);
            setError(`Failed to get live screen: ${err.message}`);
            setConnectionStatus('error');
            setIsLoading(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const takeScreenshot = async () => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/machines/screenshot/${machineId}`,
                {
                    responseType: 'blob',
                    params: {
                        save: true,
                        quality: 10 // High quality for saved screenshots
                    }
                }
            );

            // Create download link
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${machineName}_screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Screenshot save error:', err);
            setError(`Failed to save screenshot: ${err.message}`);
        }
    };

    const getConnectionStatusBadge = () => {
        switch (connectionStatus) {
            case 'connecting':
                return <Badge bg="warning"><i className="fas fa-spinner fa-spin me-1"></i>Connecting</Badge>;
            case 'connected':
                return <Badge bg="success"><i className="fas fa-check-circle me-1"></i>Live</Badge>;
            case 'error':
                return <Badge bg="danger"><i className="fas fa-exclamation-triangle me-1"></i>Error</Badge>;
            default:
                return <Badge bg="secondary">Unknown</Badge>;
        }
    };

    return (
        <div className={`live-screen-viewer ${isFullscreen ? 'fullscreen' : ''}`} 
             style={{ height: '100vh', backgroundColor: '#000' }}>
            
            {/* Header Controls */}
            <div className="viewer-header p-2 bg-dark text-white d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                    <h6 className="mb-0">
                        <i className="fas fa-desktop me-2"></i>
                        {machineName} ({machineIp})
                    </h6>
                    {getConnectionStatusBadge()}
                    <small className="text-muted">
                        Updates: {screenshotCount}
                    </small>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                    <Form.Check
                        type="switch"
                        id="auto-refresh-switch"
                        label="Auto Refresh"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="text-white"
                    />
                    
                    <Form.Select 
                        size="sm" 
                        value={refreshInterval} 
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                        style={{ width: '100px' }}
                    >
                        <option value={500}>0.5s</option>
                        <option value={1000}>1s</option>
                        <option value={2000}>2s</option>
                        <option value={5000}>5s</option>
                        <option value={10000}>10s</option>
                    </Form.Select>

                    <Form.Range
                        min={1}
                        max={10}
                        value={quality}
                        onChange={(e) => setQuality(parseInt(e.target.value))}
                        style={{ width: '100px' }}
                        title={`Quality: ${quality}`}
                    />

                    <Button variant="outline-light" size="sm" onClick={fetchScreenshot}>
                        <i className="fas fa-sync"></i>
                    </Button>

                    <Button variant="outline-light" size="sm" onClick={takeScreenshot}>
                        <i className="fas fa-camera"></i>
                    </Button>

                    <Button variant="outline-light" size="sm" onClick={toggleFullscreen}>
                        <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
                    </Button>

                    <Button variant="outline-danger" size="sm" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="m-2">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <Button 
                        variant="outline-danger" 
                        size="sm" 
                        className="ms-2"
                        onClick={fetchScreenshot}
                    >
                        Retry
                    </Button>
                </Alert>
            )}

            {/* Loading Spinner */}
            {isLoading && (
                <div className="d-flex justify-content-center align-items-center" 
                     style={{ height: 'calc(100vh - 80px)' }}>
                    <div className="text-center text-white">
                        <Spinner animation="border" variant="light" className="mb-3" />
                        <h5>Connecting to {machineName}...</h5>
                        <p>Getting live screen capture...</p>
                    </div>
                </div>
            )}

            {/* Live Screen Display */}
            <div className="screen-display text-center" 
                 style={{ height: 'calc(100vh - 80px)', overflow: 'auto' }}>
                <img
                    ref={imgRef}
                    alt={`Live screen of ${machineName}`}
                    style={{ 
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        backgroundColor: '#1a1a1a'
                    }}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setError('Failed to load screen image');
                        setConnectionStatus('error');
                    }}
                />
            </div>

            {/* Footer Info */}
            {connectionStatus === 'connected' && (
                <div className="viewer-footer position-fixed bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white p-1 text-center small">
                    Live Remote Desktop - Quality: {quality}/10 - 
                    Interval: {refreshInterval}ms - 
                    Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} - 
                    Press F11 for full screen
                </div>
            )}
        </div>
    );
};

export default LiveScreenViewer;
