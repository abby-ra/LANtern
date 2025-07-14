import React from 'react';
import { Container } from 'react-bootstrap';

function Footer() {
  return (
    <footer 
      className="mt-5 py-4" 
      style={{ 
        backgroundColor: '#2F4F2F', 
        color: '#F5F5DC',
        marginTop: 'auto'
      }}
    >
      <Container>
        <div className="text-center">
          <div className="mb-2">
            <i className="fas fa-network-wired me-2"></i>
            <strong>LANtern</strong> - Network Management System
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            © 2025 LANtern Project. All rights reserved.
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '8px' }}>
            Developed by <strong>Abby Ra</strong> & <strong>Assistant AI</strong>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
