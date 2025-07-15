import React from 'react';

function Footer() {
  return (
    <footer className="mt-12 py-6 bg-gray-300 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <div className="mb-2 text-accent-800">
            <i className="fas fa-network-wired mr-2"></i>
            <strong>LANturn</strong> - Network Management System
          </div>
          <div className="text-sm text-gray-600">
            © 2025 LANturn Project. All rights reserved.
          </div>
          {/* <div className="text-xs mt-2 text-gray-600">
            Developed by <strong>Abby Ra</strong> & <strong>Assistant AI</strong>
          </div> */}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
