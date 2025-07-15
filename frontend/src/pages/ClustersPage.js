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
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      {/* Unified Navigation and Action Bar */}
      <div className="bg-white border-b-2 border-gray-200 py-4 mb-8 shadow-light">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-8">
              <Link 
                to="/" 
                className="text-accent-800 text-3xl font-bold no-underline hover:text-primary-500 transition-colors duration-200"
              >
                <i className="fas fa-network-wired mr-2"></i>
                LANturn
              </Link>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Link 
                to="/machines" 
                className="bg-gray-100 text-accent-800 border border-gray-200 px-5 py-3 rounded-lg font-medium text-sm transition-all duration-200 no-underline inline-flex items-center gap-2 hover:bg-blue-50 hover:border-primary-500"
              >
                <i className="fas fa-desktop"></i>
                Machines
              </Link>
              <Link 
                to="/clusters" 
                className="bg-primary-500 text-white px-5 py-3 rounded-lg font-medium text-sm transition-all duration-200 no-underline inline-flex items-center gap-2 hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <i className="fas fa-layer-group"></i>
                Clusters
              </Link>
              <Button 
                onClick={() => window.location.href = '/machines'} 
                className="bg-gray-100 text-accent-800 border border-gray-200 px-5 py-3 rounded-lg font-medium text-sm transition-all duration-200 inline-flex items-center gap-2 hover:bg-blue-50 hover:border-primary-500"
                variant="outline-primary"
              >
                <i className="fas fa-plus"></i>
                Add Machine
              </Button>
              <Button 
                onClick={() => setShowClusterManager(true)} 
                className="bg-primary-500 text-white px-5 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-none inline-flex items-center gap-2 hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: '#3498DB', border: 'none' }}
              >
                <i className="fas fa-plus-circle"></i>
                Add Cluster
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">

        {alert.show && (
          <Alert 
            variant={alert.variant} 
            onClose={() => setAlert({ ...alert, show: false })} 
            dismissible
            className="rounded-lg border-none px-5 py-4 mb-4"
          >
            {alert.message}
          </Alert>
        )}

        <div className="min-h-64">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-primary-500 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading clusters...</p>
            </div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white border border-gray-200 rounded-xl shadow-light p-8">
                <i className="fas fa-layer-group text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-xl font-semibold text-accent-800 mb-2">No Clusters Found</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first cluster</p>
                <Button 
                  onClick={() => setShowClusterManager(true)}
                  className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 border-none hover:bg-primary-600 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: '#3498DB', border: 'none' }}
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Your First Cluster
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="bg-white border border-gray-200 rounded-xl shadow-light transition-all duration-200 hover:shadow-medium hover:-translate-y-1">
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

      <ClusterManager
        show={showClusterManager}
        onHide={() => setShowClusterManager(false)}
        machines={machines}
        onClusterCreated={fetchClusters}
      />
      </div>
    </div>
  );
}

export default ClustersPage;