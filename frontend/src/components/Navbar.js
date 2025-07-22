import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NavigationBar() {
  return (
    <Navbar expand="lg" className="mb-4" style={{ backgroundColor: '#2F4F2F' }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: 'black', fontWeight: 'bold', fontSize: '1.5rem', backgroundColor: '#F5F5DC', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <i className="fas fa-network-wired me-2"></i>
          LANturn
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/machines" 
              style={{ 
                color: 'black', 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                marginRight: '1rem',
                marginLeft: '2rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor: '#F5F5DC',
                transition: 'all 0.3s ease'
              }}
              className="nav-link-custom"
            >
              <i className="fas fa-server me-2"></i>
              Machines
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/clusters" 
              style={{ 
                color: 'black', 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                marginRight: '1rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor: '#F5F5DC',
                transition: 'all 0.3s ease'
              }}
              className="nav-link-custom"
            >
              <i className="fas fa-layer-group me-2"></i>
              Clusters
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/screenshots" 
              style={{ 
                color: 'black', 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                backgroundColor: '#F5F5DC',
                transition: 'all 0.3s ease'
              }}
              className="nav-link-custom"
            >
              <i className="fas fa-camera me-2"></i>
              Screenshots
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;