import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Alert, Spinner, Container } from 'react-bootstrap';
import axios from 'axios';
import MachineTable from '../components/MachineTable';
import '../components/animations.css';

const API_BASE_URL = 'http://localhost:3001/api';

function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [action, setAction] = useState('');
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
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/machines`);
      setMachines(response.data);
    } catch (err) {
      showAlert('Failed to fetch machines', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMachine = async () => {
    if (!newMachine.name.trim()) {
      showAlert('Please enter a machine name', 'danger');
      return;
    }
    if (!newMachine.mac_address.trim()) {
      showAlert('Please enter a MAC address', 'danger');
      return;
    }
    if (!newMachine.ip_address.trim()) {
      showAlert('Please enter an IP address', 'danger');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Adding machine:', newMachine);
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
      showAlert('Machine added successfully! 🎉', 'success');
    } catch (err) {
      console.error('Add machine error:', err);
      showAlert('Failed to add machine. Please try again.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMachineAction = async (machineIds, actionType) => {
    setSelectedMachines(machineIds);
    setAction(actionType);
    // Directly confirm action without password modal
    confirmAction(machineIds, actionType);
  };

  const confirmAction = async (machineIds, actionType) => {
    try {
      await axios.post(`${API_BASE_URL}/machines/cluster-action`, {
        machineIds,
        action: actionType,
        initiated_by: 'admin'
      });
      showAlert(`${actionType} command sent successfully`, 'success');
    } catch (err) {
      showAlert(`Failed to perform ${actionType}`, 'danger');
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  const handleEditMachine = (machine) => {
    setEditingMachine(machine);
    setNewMachine({
      name: machine.name,
      mac_address: machine.mac_address,
      ip_address: machine.ip_address,
      subnet_mask: machine.subnet_mask,
      broadcast_address: machine.broadcast_address,
      username: machine.username,
      password: machine.encrypted_password || machine.password || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateMachine = async () => {
    if (!newMachine.name.trim()) {
      showAlert('Please enter a machine name', 'danger');
      return;
    }
    if (!newMachine.mac_address.trim()) {
      showAlert('Please enter a MAC address', 'danger');
      return;
    }
    if (!newMachine.ip_address.trim()) {
      showAlert('Please enter an IP address', 'danger');
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Updating machine:', editingMachine.id, newMachine);
      await axios.put(`${API_BASE_URL}/machines/${editingMachine.id}`, newMachine);
      setShowEditModal(false);
      setEditingMachine(null);
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
      showAlert('Machine updated successfully! ✨', 'success');
    } catch (err) {
      console.error('Update machine error:', err);
      showAlert('Failed to update machine. Please try again.', 'danger');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteMachine = async (machineId) => {
    if (window.confirm('⚠️ Are you sure you want to delete this machine? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE_URL}/machines/${machineId}`);
        fetchMachines();
        showAlert('Machine deleted successfully! 🗑️', 'success');
      } catch (err) {
        console.error('Delete machine error:', err);
        showAlert('Failed to delete machine. Please try again.', 'danger');
      }
    }
  };

  return (
    <Container fluid className="page-container">
      <div className="d-flex justify-content-between align-items-center mb-4 page-header">
        <h2 className="gradient-bg p-3 rounded-3 shadow-sm" style={{ color: 'black' }}>
          <i className="fas fa-server me-2"></i>
          Machines Management
        </h2>
        <div>
          <Button 
            variant="primary" 
            className="btn-animated"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus me-2"></i> Add Machine
          </Button>
        </div>
      </div>

      {alert.show && (
        <Alert 
          variant={alert.variant} 
          onClose={() => setAlert({ ...alert, show: false })} 
          dismissible
          className="shadow-sm"
        >
          {alert.message}
        </Alert>
      )}

      <div className="table-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary loading-spinner" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading machines...</p>
          </div>
        ) : (
          <div className="slide-in-left">
            <MachineTable 
              machines={machines} 
              onAction={handleMachineAction}
              onEdit={handleEditMachine}
              onDelete={handleDeleteMachine}
            />
          </div>
        )}
      </div>

      {/* Add Machine Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg" className="fade">
        <Modal.Header closeButton className="gradient-bg">
          <Modal.Title>
            <i className="fas fa-plus-circle me-2"></i>
            Add New Machine
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-tag me-2"></i>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    placeholder="Enter machine name"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-network-wired me-2"></i>MAC Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.mac_address}
                    onChange={e => setNewMachine({ ...newMachine, mac_address: e.target.value })}
                    placeholder="Enter MAC address"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-broadcast-tower me-2"></i>Broadcast Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.broadcast_address}
                    onChange={e => setNewMachine({ ...newMachine, broadcast_address: e.target.value })}
                    placeholder="Enter broadcast address"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-user me-2"></i>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.username}
                    onChange={e => setNewMachine({ ...newMachine, username: e.target.value })}
                    placeholder="Enter username"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label><i className="fas fa-lock me-2"></i>Password</Form.Label>
              <Form.Control
                type="password"
                value={newMachine.password}
                onChange={e => setNewMachine({ ...newMachine, password: e.target.value })}
                placeholder="Enter password"
                className="shadow-sm"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowAddModal(false)} className="btn-animated">
            <i className="fas fa-times me-2"></i>Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddMachine} 
            disabled={isLoading}
            className="btn-animated"
          >
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
                Adding...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>Save Machine
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Machine Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" className="fade">
        <Modal.Header closeButton className="gradient-bg">
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Edit Machine
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-tag me-2"></i>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    placeholder="Enter machine name"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-network-wired me-2"></i>MAC Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.mac_address}
                    onChange={e => setNewMachine({ ...newMachine, mac_address: e.target.value })}
                    placeholder="Enter MAC address"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-globe me-2"></i>IP Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.ip_address}
                    onChange={e => setNewMachine({ ...newMachine, ip_address: e.target.value })}
                    placeholder="Enter IP address"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-mask me-2"></i>Subnet Mask</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.subnet_mask}
                    onChange={e => setNewMachine({ ...newMachine, subnet_mask: e.target.value })}
                    placeholder="Enter subnet mask"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-broadcast-tower me-2"></i>Broadcast Address</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.broadcast_address}
                    onChange={e => setNewMachine({ ...newMachine, broadcast_address: e.target.value })}
                    placeholder="Enter broadcast address"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label><i className="fas fa-user me-2"></i>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={newMachine.username}
                    onChange={e => setNewMachine({ ...newMachine, username: e.target.value })}
                    placeholder="Enter username"
                    className="shadow-sm"
                  />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label><i className="fas fa-lock me-2"></i>Password</Form.Label>
              <Form.Control
                type="password"
                value={newMachine.password}
                onChange={e => setNewMachine({ ...newMachine, password: e.target.value })}
                placeholder="Enter password"
                className="shadow-sm"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowEditModal(false)} className="btn-animated">
            <i className="fas fa-times me-2"></i>Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateMachine} 
            disabled={isUpdating}
            className="btn-animated"
          >
            {isUpdating ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
                Updating...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>Update Machine
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Password Confirmation Modal removed. Actions are now direct. */}
    </Container>
  );
}

export default MachinesPage;