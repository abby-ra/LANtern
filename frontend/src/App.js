import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MachinesPage from './pages/MachinesPage';
import ClustersPage from './pages/ClustersPage';

function App() {
  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#F5F5DC' }}>
      <Navbar />
      <div className="container mt-4 flex-grow-1">
        <Routes>
          <Route path="/" element={<MachinesPage />} />
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/clusters" element={<ClustersPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;