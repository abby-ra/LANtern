import React, { useState } from 'react';
import { Table, Button, Alert, Badge, Dropdown, DropdownButton } from 'react-bootstrap';
import './animations.css';

function MachineTable({ machines, onAction, onEdit, onDelete }) {
  const [selectedMachines, setSelectedMachines] = useState([]);

  const handleMachineSelect = (machineId, isSelected) => {
    setSelectedMachines(prev =>
      isSelected
        ? [...prev, machineId]
        : prev.filter(id => id !== machineId)
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
              {selectedMachines.length} machine(s) selected
            </small>
          </div>
        )}
      </div>

      <Table striped bordered hover responsive className="shadow-sm rounded-3 overflow-hidden">
        <thead className="table-dark">
          <tr>
            <th width="50">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMachines(machines.map(m => m.id));
                  } else {
                    setSelectedMachines([]);
                  }
                }}
                checked={selectedMachines.length === machines.length && machines.length > 0}
              />
            </th>
            <th><i className="fas fa-tag me-2"></i>Name</th>
            <th><i className="fas fa-globe me-2"></i>IP Address</th>
            <th><i className="fas fa-network-wired me-2"></i>MAC Address</th>
            <th><i className="fas fa-signal me-2"></i>Status</th>
            <th width="400"><i className="fas fa-cogs me-2"></i>Actions</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((machine, index) => (
            <tr key={machine.id} className="table-row" style={{animationDelay: `${index * 0.1}s`}}>
              <td>
                <input
                  type="checkbox"
                  onChange={e => handleMachineSelect(machine.id, e.target.checked)}
                  checked={selectedMachines.includes(machine.id)}
                />
              </td>
              <td>
                <strong className="text-primary">
                  <i className="fas fa-server me-2"></i>
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
                {machine.is_active === 1 ? (
                  <Badge bg="success" className="status-indicator active">
                    <i className="fas fa-circle me-1"></i>
                    Active
                  </Badge>
                ) : (
                  <Badge bg="danger" className="status-indicator idle">
                    <i className="fas fa-circle me-1"></i>
                    Idle
                  </Badge>
                )}
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
    </div>
  );
}

export default MachineTable;