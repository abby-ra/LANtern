import React, { useState, useEffect } from 'react';
import { Button, Alert, Card } from 'react-bootstrap';
import axios from 'axios';
import ClusterManager from '../components/ClusterManager';
import ClusterCard from '../components/ClusterCard';

const API_BASE_URL = 'http://localhost:3001/api';

function ClustersPage() {
  const [clusters, setClusters] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showClusterManager, setShowClusterManager] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    const loadData = async () => {
      await fetchMachines();
      await fetchClusters();
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
        password,
        initiated_by: 'admin'
      });
      showAlert(`Cluster ${action} initiated`, 'success');
      return true;
    } catch (err) {
      showAlert(`Failed to ${action} cluster`, 'danger');
      return false;
    }
  };

  const handleDeleteCluster = async (clusterId) => {
    try {
      await axios.delete(`${API_BASE_URL}/clusters/${clusterId}`);
      fetchClusters();
      showAlert('Cluster deleted successfully', 'success');
    } catch (err) {
      showAlert('Failed to delete cluster', 'danger');
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Cluster Management</h2>
        <Button variant="primary" onClick={() => setShowClusterManager(true)}>
          <i className="fas fa-plus"></i> Create Cluster
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      {clusters.length === 0 ? (
        <Card>
          <Card.Body>
            <p className="text-center">No clusters defined yet. Create one to manage groups of machines.</p>
          </Card.Body>
        </Card>
      ) : (
        clusters.map(cluster => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            onClusterAction={handleClusterPowerAction}
            onDelete={handleDeleteCluster}
          />
        ))
      )}

      <ClusterManager
        show={showClusterManager}
        onHide={() => setShowClusterManager(false)}
        machines={machines}
        onClusterCreated={fetchClusters}
      />
    </>
  );
}

export default ClustersPage;