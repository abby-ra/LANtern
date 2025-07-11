import React, { useState } from 'react';
import { Table, Button, Alert } from 'react-bootstrap';

function MachineTable({ machines, onAction }) {
  const [selectedMachines, setSelectedMachines] = useState([]);

  const handleMachineSelect = (machineId, isSelected) => {
    setSelectedMachines(prev =>
      isSelected
        ? [...prev, machineId]
        : prev.filter(id => id !== machineId)
    );
  };

  return (
    <>
      <div className="mb-3">
        <Button
          variant="success"
          className="me-2"
          disabled={selectedMachines.length === 0}
          onClick={() => onAction(selectedMachines, 'wake')}
        >
          <i className="fas fa-power-off"></i> Start Selected
        </Button>
        <Button
          variant="warning"
          className="me-2"
          disabled={selectedMachines.length === 0}
          onClick={() => onAction(selectedMachines, 'restart')}
        >
          <i className="fas fa-redo"></i> Restart Selected
        </Button>
        <Button
          variant="danger"
          disabled={selectedMachines.length === 0}
          onClick={() => onAction(selectedMachines, 'shutdown')}
        >
          <i className="fas fa-power-off"></i> Shutdown Selected
        </Button>
      </div>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>IP Address</th>
            <th>MAC Address</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(machine => (
            <tr key={machine.id}>
              <td>
                <input
                  type="checkbox"
                  onChange={e => handleMachineSelect(machine.id, e.target.checked)}
                />
              </td>
              <td>{machine.name}</td>
              <td>{machine.ip_address}</td>
              <td>{machine.mac_address}</td>
              <td>
                <span className="badge bg-success">Active</span>
              </td>
              <td>
                <Button
                  variant="success"
                  size="sm"
                  className="me-2"
                  onClick={() => onAction([machine.id], 'wake')}
                >
                  <i className="fas fa-power-off"></i> Start
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  className="me-2"
                  onClick={() => onAction([machine.id], 'restart')}
                >
                  <i className="fas fa-redo"></i> Restart
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onAction([machine.id], 'shutdown')}
                >
                  <i className="fas fa-power-off"></i> Shutdown
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

export default MachineTable;