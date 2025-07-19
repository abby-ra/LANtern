# MeshCentral Integration for LANtern

## Overview

This document describes the MeshCentral integration that has been added to the LANtern application. MeshCentral is an open-source, multi-platform computer management system that provides remote desktop, terminal, and file management capabilities.

## Features Added

### 1. MeshCentral Remote Access Modal
- **Location**: `frontend/src/components/MeshCentralModal.js`
- **Purpose**: Provides a user interface for connecting to and managing MeshCentral remote sessions
- **Features**:
  - Server configuration management
  - Node discovery and listing
  - Remote desktop sessions
  - Terminal sessions
  - File management sessions

### 2. Enhanced Machine Table
- **Location**: `frontend/src/components/MachineTable.js`
- **Enhancement**: Added "Remote" option in the actions dropdown for each machine
- **Functionality**: Opens the MeshCentralModal for the selected machine

### 3. Backend API Endpoints
- **Location**: `backend/server.js`
- **New Endpoints**:
  - `POST /api/meshcentral/connect` - Connect to MeshCentral server
  - `POST /api/meshcentral/nodes` - Fetch mesh nodes for a machine
  - `POST /api/meshcentral/remote-session` - Create remote access sessions

## How to Use

### 1. Setup MeshCentral Server
Before using the remote access features, you need to set up a MeshCentral server:

1. Install MeshCentral on your server:
   ```bash
   npm install meshcentral -g
   meshcentral
   ```

2. Access the MeshCentral web interface (typically `https://your-server:443`)

3. Create user accounts and install MeshAgent on target machines

### 2. Configure LANtern for MeshCentral

1. **Start LANtern Application**:
   - Frontend: `cd frontend && npm start`
   - Backend: `cd backend && node server.js`

2. **Access Remote Control**:
   - Go to the Machines page
   - Click the "Actions" dropdown for any machine
   - Select "Remote" to open the MeshCentral modal

3. **Configure Connection**:
   - Enter your MeshCentral server URL (e.g., `https://meshcentral.example.com`)
   - Provide your MeshCentral username and password
   - Set the domain (usually 'default')
   - Click "Save Configuration" to store settings locally
   - Click "Connect to MeshCentral"

4. **Access Remote Sessions**:
   - After successful connection, go to the "Nodes" tab
   - You'll see available mesh nodes for the selected machine
   - Use the buttons to launch:
     - **Desktop**: Remote desktop control
     - **Terminal**: Command-line access
     - **Files**: File management interface

## Configuration Options

### MeshCentral Server Settings
- **Server URL**: The full URL of your MeshCentral server
- **Username**: Your MeshCentral account username
- **Password**: Your MeshCentral account password
- **Domain**: MeshCentral domain (usually 'default')

### Session Types
1. **Desktop**: Full remote desktop control with mouse and keyboard
2. **Terminal**: Command-line interface for remote shell access
3. **Files**: Web-based file browser for uploading/downloading files

## Security Considerations

1. **HTTPS Required**: MeshCentral should always use HTTPS in production
2. **Strong Passwords**: Use strong passwords for MeshCentral accounts
3. **Network Security**: Ensure proper firewall configuration
4. **User Access Control**: Limit MeshCentral user permissions appropriately

## Troubleshooting

### Common Issues

1. **Connection Failed**:
   - Verify MeshCentral server URL is correct and accessible
   - Check username/password credentials
   - Ensure MeshCentral server is running

2. **No Nodes Found**:
   - Verify MeshAgent is installed on target machines
   - Check that machines are online and connected to MeshCentral
   - Confirm user has appropriate permissions

3. **Session Launch Failed**:
   - Ensure target machine is online
   - Check MeshCentral server logs for errors
   - Verify network connectivity between LANtern and MeshCentral

## Future Enhancements

Potential improvements for the MeshCentral integration:

1. **Real MeshCentral API Integration**: Currently uses mock responses
2. **Bulk Remote Operations**: Apply remote actions to multiple machines
3. **Session Management**: Track active sessions and allow disconnection
4. **Advanced Security**: Certificate-based authentication
5. **Mobile Support**: Responsive design for mobile remote access

## Development Notes

### Mock Implementation
The current implementation uses mock API responses for demonstration purposes. To implement real MeshCentral integration:

1. Install the MeshCentral API client library
2. Replace mock responses with actual MeshCentral API calls
3. Implement proper authentication and session management
4. Add error handling for various MeshCentral-specific scenarios

### API Structure
The backend endpoints follow a RESTful structure:
- Authentication handled via `/meshcentral/connect`
- Node discovery via `/meshcentral/nodes`  
- Session creation via `/meshcentral/remote-session`

Each endpoint includes proper error handling and logging for debugging purposes.

## Dependencies

### Frontend
- React Bootstrap components for UI
- Axios for HTTP requests
- localStorage for configuration persistence

### Backend
- Express.js endpoints
- MySQL database integration
- CORS support for cross-origin requests

## Conclusion

The MeshCentral integration provides a powerful remote access solution within the LANtern management interface. Users can now remotely control, manage, and troubleshoot machines directly from the web interface without needing separate remote desktop clients.
