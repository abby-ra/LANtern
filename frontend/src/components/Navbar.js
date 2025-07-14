import React from 'react';
import { Nav, Navbar, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NavigationBar() {
  return (
    <Navbar expand="lg" className="mb-4" style={{ backgroundColor: '#B8860B' }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: 'black', fontWeight: 'bold', fontSize: '1.5rem' }}>
          <i className="fas fa-network-wired me-2"></i>
          LANtern
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/machines" style={{ color: 'black' }}>Machines</Nav.Link>
            <Nav.Link as={Link} to="/clusters" style={{ color: 'black' }}>Clusters</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavigationBar;