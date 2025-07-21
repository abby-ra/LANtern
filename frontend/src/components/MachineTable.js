import React, { useState } from 'react';
import { Table, Button, Badge, Dropdown, DropdownButton, Spinner } from 'react-bootstrap';
import axios from 'axios';
import VisualRemoteAccessModal from './VisualRemoteAccessModal';
import './animations.css';

const API_BASE_URL = 'http://localhost:3001/api';

function MachineTable({ machines, onAction, onEdit, onDelete }) {
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [machineStatuses, setMachineStatuses] = useState({});
  const [pingInProgress, setPingInProgress] = useState({});
  const [showVisualRemoteModal, setShowVisualRemoteModal] = useState(false);
  const [selectedMachineForRemote, setSelectedMachineForRemote] = useState(null);

  // Ping verification function
  const verifyMachineStatus = async (machine) => {
    setPingInProgress(prev => ({ ...prev, [machine.id]: true }));
    try {
      const response = await axios.post(`${API_BASE_URL}/machines/${machine.id}/ping`);
      const isOnline = response.data.isOnline;
      
      setMachineStatuses(prev => ({
        ...prev,
        [machine.id]: {
          isOnline,
          lastPing: new Date(),
          responseTime: response.data.responseTime || null
        }
      }));

      // Update machine status in database if different
      if ((isOnline && machine.is_active !== 1) || (!isOnline && machine.is_active !== 0)) {
        await axios.put(`${API_BASE_URL}/machines/${machine.id}`, {
          ...machine,
          is_active: isOnline ? 1 : 0
        });
      }
    } catch (error) {
      console.error('Ping failed:', error);
      setMachineStatuses(prev => ({
        ...prev,
        [machine.id]: {
          isOnline: false,
          lastPing: new Date(),
          responseTime: null,
          error: true
        }
      }));
    } finally {
      setPingInProgress(prev => ({ ...prev, [machine.id]: false }));
    }
  };

  // Visual remote access handler
  const handleVisualRemoteAccess = (machine) => {
    setSelectedMachineForRemote(machine);
    setShowVisualRemoteModal(true);
  };

  // Removed auto-ping functionality - only ping when refresh button is clicked

  const handleMachineSelect = (machineId, isSelected) => {
    setSelectedMachines(prev =>
      isSelected
        ? [...prev, machineId]
        : prev.filter(id => id !== machineId)
    );
  };

  const getMachineStatus = (machine) => {
    const pingStatus = machineStatuses[machine.id];
    if (pingStatus) {
      return pingStatus.isOnline;
    }
    // Use database status if no ping has been performed
    return machine.is_active === 1;
  };

  const getStatusBadge = (machine) => {
    const isOnline = getMachineStatus(machine);
    const pingStatus = machineStatuses[machine.id];
    const isPinging = pingInProgress[machine.id];

    if (isPinging) {
      return (
        <Badge bg="warning" className="d-flex align-items-center gap-1">
          <div className="ping-spinner"></div>
          Checking...
        </Badge>
      );
    }

    if (pingStatus?.error) {
      return (
        <Badge bg="danger" className="status-indicator idle" title="Machine is offline or unreachable">
          <i className="fas fa-circle me-1"></i>
          Idle
        </Badge>
      );
    }

    // Show if status is from ping or database
    const statusSource = pingStatus ? 'Live' : 'Last Known';
    
    return isOnline ? (
      <Badge bg="success" className="status-indicator active" title={pingStatus?.responseTime ? `${statusSource} - Response time: ${pingStatus.responseTime}ms` : `${statusSource} - Machine is online`}>
        <i className="fas fa-circle me-1"></i>
        Active
        {pingStatus?.responseTime && (
          <small className="ms-1">({pingStatus.responseTime}ms)</small>
        )}
        {!pingStatus && (
          <small className="ms-1 opacity-75">(Last Known)</small>
        )}
      </Badge>
    ) : (
      <Badge bg="danger" className="status-indicator idle" title={`${statusSource} - Machine is offline or unreachable`}>
        <i className="fas fa-circle me-1"></i>
        Idle
        {!pingStatus && (
          <small className="ms-1 opacity-75">(Last Known)</small>
        )}
      </Badge>
    );
  };

  return (
    <div className="machine-table-container">
      <div className="mb-4 p-3 bg-light rounded-3 shadow-sm">
        <h5 className="mb-3">
          <i className="fas fa-tools me-2 text-primary"></i>
          Bulk Actions
        </h5>
        <div className="btn-group">
          <Button
            variant="success"
            className="btn-animated me-2"
            disabled={selectedMachines.length === 0}
            onClick={() => onAction(selectedMachines, 'wake')}
          >
            <i className="fas fa-power-off me-2"></i> 
            Start Selected ({selectedMachines.length})
          </Button>
          <Button
            variant="warning"
            className="btn-animated me-2"
            disabled={selectedMachines.length === 0}
            onClick={() => onAction(selectedMachines, 'restart')}
          >
            <i className="fas fa-redo me-2"></i> 
            Restart Selected ({selectedMachines.length})
          </Button>
          <Button
            variant="danger"
            className="btn-animated"
            disabled={selectedMachines.length === 0}
            onClick={() => onAction(selectedMachines, 'shutdown')}
          >
            <i className="fas fa-power-off me-2"></i> 
            Shutdown Selected ({selectedMachines.length})
          </Button>
        </div>
        {selectedMachines.length > 0 && (
          <div className="mt-2">
            <small className="text-muted">
              <i className="fas fa-info-circle me-1"></i>
              {selectedMachines.length} PC(s) selected for bulk action
            </small>
          </div>
        )}
      </div>

      <Table striped bordered hover responsive className="shadow-sm rounded-3 overflow-hidden">
        <thead className="table-dark">
          <tr>
            <th width="50">
              <div className="custom-checkbox">
                <input
                  type="checkbox"
                  id="select-all-machines"
                  className="curved-checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMachines(machines.map(m => m.id));
                    } else {
                      setSelectedMachines([]);
                    }
                  }}
                  checked={selectedMachines.length === machines.length && machines.length > 0}
                />
                <label htmlFor="select-all-machines" className="checkbox-label"></label>
              </div>
            </th>
            <th><i className="fas fa-tag me-2"></i>Name</th>
            <th><i className="fas fa-globe me-2"></i>IP Address</th>
            <th><i className="fas fa-network-wired me-2"></i>MAC Address</th>
            <th>
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-signal me-2"></i>Status
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                  onClick={() => {
                    machines.forEach(machine => verifyMachineStatus(machine));
                  }}
                  disabled={Object.values(pingInProgress).some(Boolean)}
                  title="Refresh all machine statuses"
                >
                  {Object.values(pingInProgress).some(Boolean) ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <i className="fas fa-sync-alt"></i>
                  )}
                </Button>
              </div>
            </th>
            <th width="400"><i className="fas fa-cogs me-2"></i>Actions</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine, index) => (
            <tr key={machine.id} className="table-row" style={{animationDelay: `${index * 0.1}s`}}>
              <td>
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    id={`machine-${machine.id}`}
                    className="curved-checkbox"
                    onChange={e => handleMachineSelect(machine.id, e.target.checked)}
                    checked={selectedMachines.includes(machine.id)}
                  />
                  <label htmlFor={`machine-${machine.id}`} className="checkbox-label"></label>
                </div>
              </td>
              <td>
                <strong className="text-primary">
                  <i className="fas fa-desktop me-2"></i>
                  {machine.name}
                </strong>
              </td>
              <td>
                <code className="bg-light p-1 rounded">{machine.ip_address}</code>
              </td>
              <td>
                <code className="bg-light p-1 rounded">{machine.mac_address}</code>
              </td>
              <td>
                {getStatusBadge(machine)}
              </td>
              <td>
                <DropdownButton
                  id={`machine-actions-${machine.id}`}
                  title={
                    <>
                      <i className="fas fa-cog me-2"></i>
                      Actions
                    </>
                  }
                  variant="outline-primary"
                  size="sm"
                  style={{ minWidth: '120px' }}
                >
                  <Dropdown.Item 
                    onClick={() => onAction([machine.id], 'wake')}
                    className="text-success"
                  >
                    <i className="fas fa-play me-2"></i>Start
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => onAction([machine.id], 'shutdown')}
                    className="text-danger"
                  >
                    <i className="fas fa-power-off me-2"></i>Shutdown
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => onAction([machine.id], 'restart')}
                    className="text-warning"
                  >
                    <i className="fas fa-redo me-2"></i>Restart
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item 
                    onClick={() => handleVisualRemoteAccess(machine)}
                    className="text-primary"
                  >
                    <i className="fas fa-desktop me-2"></i>Remote
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item 
                    onClick={() => onEdit(machine)}
                    className="text-info"
                  >
                    <i className="fas fa-edit me-2"></i>Edit
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => onDelete(machine.id)}
                    className="text-danger"
                  >
                    <i className="fas fa-trash me-2"></i>Delete
                  </Dropdown.Item>
                </DropdownButton>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {machines.length === 0 && (
        <div className="text-center p-5">
          <i className="fas fa-server fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No machines found</h5>
          <p className="text-muted">Click "Add Machine" to get started</p>
        </div>
      )}

      {/* Visual Remote Access Modal */}
      <VisualRemoteAccessModal
        show={showVisualRemoteModal}
        onHide={() => {
          setShowVisualRemoteModal(false);
          setSelectedMachineForRemote(null);
        }}
        machine={selectedMachineForRemote}
      />
    </div>
  );
}

export default MachineTable;