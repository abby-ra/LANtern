import React, { useState, useEffect } from 'react';
import { Button, Alert, Card, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ClusterManager from '../components/ClusterManager';
import ClusterCard from '../components/ClusterCard';
import '../components/animations.css';

const API_BASE_URL = 'http://localhost:3001/api';

function ClustersPage() {
  const [clusters, setClusters] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showClusterManager, setShowClusterManager] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCluster, setEditingCluster] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchMachines();
      await fetchClusters();
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchMachines = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines`);
      setMachines(response.data);
    } catch (err) {
      showAlert('Failed to fetch machines', 'danger');
    }
  };

  const fetchClusters = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/clusters`);
      const clustersWithCounts = await Promise.all(
        response.data.map(async cluster => {
          const details = await axios.get(`${API_BASE_URL}/clusters/${cluster.id}`);
          return {
            ...cluster,
            machine_count: details.data.machines.length
          };
        })
      );
      setClusters(clustersWithCounts);
    } catch (err) {
      showAlert('Failed to fetch clusters', 'danger');
    }
  };

  const handleClusterPowerAction = async (clusterId, action, password) => {
    try {
      await axios.post(`${API_BASE_URL}/clusters/${clusterId}/action`, {
        action,
        password: password || 'admin123', // Using default password like MachinesPage
        initiated_by: 'admin'
      });
      showAlert(`Cluster ${action} initiated successfully! 🎉`, 'success');
      return true;
    } catch (err) {
      showAlert(`Failed to ${action} cluster. Please try again.`, 'danger');
      return false;
    }
  };

  const handleEditCluster = (cluster) => {
    setEditingCluster(cluster);
    setShowEditModal(true);
  };

  const handleDeleteCluster = async (clusterId) => {
    if (window.confirm('⚠️ Are you sure you want to delete this cluster? This action cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE_URL}/clusters/${clusterId}`);
        fetchClusters();
        showAlert('Cluster deleted successfully! 🗑️', 'success');
      } catch (err) {
        showAlert('Failed to delete cluster. Please try again.', 'danger');
      }
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  return (
    <div className="page-container">
      {/* Unified Navigation and Action Bar */}
      <div className="unified-nav-bar">
        <Container fluid>
          <div className="nav-content">
            <div className="brand-section">
              <Link to="/" className="brand-logo">
                <i className="fas fa-network-wired me-2"></i>
                LANtern
              </Link>
            </div>
            <div className="nav-actions">
              <Link to="/machines" className="action-btn secondary">
                <i className="fas fa-server"></i>
                Machines
              </Link>
              <Link to="/clusters" className="action-btn">
                <i className="fas fa-layer-group"></i>
                Clusters
              </Link>
              <Button 
                onClick={() => window.location.href = '/machines'} 
                className="action-btn secondary"
              >
                <i className="fas fa-plus"></i>
                Add Machine
              </Button>
              <Button 
                onClick={() => setShowClusterManager(true)} 
                className="action-btn"
              >
                <i className="fas fa-plus-circle"></i>
                Add Cluster
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <Container fluid>

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

      <div className="clusters-container">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary loading-spinner" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading clusters...</p>
          </div>
        ) : (
          <div className="slide-in-left">
            {clusters.length === 0 ? (
              <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-5">
                  <div className="mb-3">
                    <i className="fas fa-layer-group fa-3x text-muted"></i>
                  </div>
                  <h5 className="text-muted mb-2">No clusters defined yet</h5>
                  <p className="text-muted">Create your first cluster to manage groups of machines efficiently.</p>
                  <Button 
                    variant="primary" 
                    className="btn-animated mt-3"
                    onClick={() => setShowClusterManager(true)}
                  >
                    <i className="fas fa-plus me-2"></i>Create Your First Cluster
                  </Button>
                </Card.Body>
              </Card>
            ) : (
              <div className="row g-4">
                {clusters.map(cluster => (
                  <div key={cluster.id} className="col-lg-6 col-xl-4">
                    <ClusterCard
                      cluster={cluster}
                      onClusterAction={handleClusterPowerAction}
                      onEdit={handleEditCluster}
                      onDelete={handleDeleteCluster}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ClusterManager
        show={showClusterManager}
        onHide={() => setShowClusterManager(false)}
        machines={machines}
        onClusterCreated={fetchClusters}
      />
      </Container>
    </div>
  );
}

export default ClustersPage;