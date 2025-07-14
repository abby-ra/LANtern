import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';
import MachinesPage from './pages/MachinesPage';
import ClustersPage from './pages/ClustersPage';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-grow">
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