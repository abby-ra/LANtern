import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MachinesPage from './pages/MachinesPage';
import ClustersPage from './pages/ClustersPage';

function App() {
  return (
    <div className="container mt-4">
      <Navbar />
      <Routes>
        <Route path="/" element={<MachinesPage />} />
        <Route path="/machines" element={<MachinesPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
      </Routes>
    </div>
  );
}

export default App;