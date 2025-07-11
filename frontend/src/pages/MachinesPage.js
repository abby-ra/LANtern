import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import MachineTable from '../components/MachineTable';

const API_BASE_URL = 'http://localhost:3001/api';

function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [action, setAction] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMachines, setSelectedMachines] = useState([]);
  const [newMachine, setNewMachine] = useState({
    name: '',
    mac_address: '',
    ip_address: '',
    subnet_mask: '255.255.255.0',
    broadcast_address: '',
    username: '',
    password: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines`);
      setMachines(response.data);
    } catch (err) {
      showAlert('Failed to fetch machines', 'danger');
    }
  };

  const handleAddMachine = async () => {
    try {
      await axios.post(`${API_BASE_URL}/machines`, newMachine);
      setShowAddModal(false);
      setNewMachine({
        name: '',
        mac_address: '',
        ip_address: '',
        subnet_mask: '255.255.255.0',
        broadcast_address: '',
        username: '',
        password: ''
      });
      fetchMachines();
      showAlert('Machine added successfully', 'success');
    } catch (err) {
      showAlert('Failed to add machine', 'danger');
    }
  };

  const handleMachineAction = async (machineIds, actionType) => {
    setSelectedMachines(machineIds);
    setAction(actionType);
    setShowPasswordModal(true);
  };

  const confirmAction = async () => {
    try {
      if (action === 'wake') {
        await axios.post(`${API_BASE_URL}/machines/cluster-action`, {
          machineIds: selectedMachines,
          action: 'wake',
          initiated_by: 'admin'
        });
      } else {
        await axios.post(`${API_BASE_URL}/machines/cluster-action`, {
          machineIds: selectedMachines,
          action,
          password,
          initiated_by: 'admin'
        });
      }
      showAlert(`${action} command sent successfully`, 'success');
      setShowPasswordModal(false);
      setPassword('');
    } catch (err) {
      showAlert(`Failed to perform ${action}`, 'danger');
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Machines Management</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="fas fa-plus"></i> Add Machine
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      <MachineTable machines={machines} onAction={handleMachineAction} />

      {/* Add Machine Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Machine</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Form fields same as before */}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddMachine}>
            Save Machine
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm {action.charAt(0).toUpperCase() + action.slice(1)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {action !== 'wake' && (
            <Form.Group className="mb-3">
              <Form.Label>Admin Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Form.Group>
          )}
          <p>
            Are you sure you want to {action} {selectedMachines.length} selected machines?
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmAction}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default MachinesPage;