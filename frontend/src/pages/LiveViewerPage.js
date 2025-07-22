import React from 'react';
import { useSearchParams } from 'react-router-dom';
import LiveScreenViewer from '../components/LiveScreenViewer';

const LiveViewerPage = () => {
    const [searchParams] = useSearchParams();
    const machineId = searchParams.get('machineId');
    const machineName = searchParams.get('name') || 'Unknown Machine';
    const machineIp = searchParams.get('ip') || 'Unknown IP';

    const handleClose = () => {
        window.close();
    };

    if (!machineId) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="alert alert-danger">
                    <h4>Error</h4>
                    <p>Machine ID is required to view live screen.</p>
                    <button className="btn btn-danger" onClick={handleClose}>Close Window</button>
                </div>
            </div>
        );
    }

    return (
        <LiveScreenViewer
            machineId={machineId}
            machineName={machineName}
            machineIp={machineIp}
            onClose={handleClose}
        />
    );
};

export default LiveViewerPage;
