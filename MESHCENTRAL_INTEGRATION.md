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

# Visual Remote Access Integration for LANtern

## Overview

This document describes the **Visual Remote Access** system that has been integrated into the LANtern application. This system provides immediate visual access to remote machines using their stored database credentials, offering multiple connection methods including RDP, VNC, Web-based remote desktop, and SSH terminal access.

## 🎯 Key Features

### 1. Immediate Visual Access
- **One-click remote desktop** connection using stored machine credentials
- **Multiple connection protocols** (RDP, VNC, Web-based, SSH)
- **Real-time connection status** with visual indicators
- **Automatic credential retrieval** from the machine database

### 2. Enhanced Remote Access Modal
- **Location**: `frontend/src/components/VisualRemoteAccessModal.js`
- **Purpose**: Provides instant visual remote access to machines
- **Features**:
  - Quick Access tab with visual connection cards
  - Connection Details tab showing active session info
  - Support for offline/online machine detection
  - Integrated credential management using database

### 3. Multiple Access Methods

#### 🖥️ Remote Desktop (RDP)
- **Best for**: Windows machines with full desktop control
- **Download RDP file** with pre-configured credentials
- **Port**: 3389
- **Requirements**: Remote Desktop enabled on target Windows machine

#### 👁️ VNC Viewer  
- **Best for**: Cross-platform screen sharing
- **Opens native VNC client** with connection URL
- **Port**: 5900
- **Requirements**: VNC server running on target machine

#### 🌐 Web-based Remote Desktop
- **Best for**: No-software-needed browser access
- **Custom web VNC viewer** built into LANtern
- **Port**: 6080
- **Features**: Fullscreen mode, Ctrl+Alt+Del, session controls

#### 💻 SSH Terminal
- **Best for**: Command-line access and advanced users
- **Copies SSH command** to clipboard for terminal use
- **Port**: 22
- **Requirements**: SSH server enabled on target machine

## 🚀 How to Use

### 1. Quick Remote Access

1. **Navigate to Machines**: Go to the Machines page in LANtern
2. **Select Machine**: Click the "Actions" dropdown for any machine
3. **Click "Remote"**: This opens the Visual Remote Access modal
4. **Choose Connection Method**: Select from the available connection cards
5. **Connect Instantly**: Click "Connect" on your preferred method

### 2. Using Database Credentials

The system automatically uses stored machine credentials from the database:
- **Username**: Retrieved from `machines.username` field
- **Password**: Retrieved from `machines.encrypted_password` field  
- **IP Address**: Retrieved from `machines.ip_address` field
- **Machine Status**: Uses `machines.is_active` for availability

### 3. Connection Process

1. **Credential Retrieval**: System fetches machine data from database
2. **Connection Setup**: Prepares connection based on selected method
3. **Visual Access**: Launches appropriate client or viewer
4. **Session Management**: Tracks active connections
     - **Files**: File management interface

## 🔧 Technical Implementation

### Backend API Endpoints
- **Location**: `backend/server.js`
- **New Endpoints**:
  - `POST /api/remote-access/direct` - Establishes direct visual remote access
  - `POST /api/meshcentral/connect` - Enhanced connection with credential integration  
  - `POST /api/meshcentral/nodes` - Fetches machine nodes with access methods
  - `GET /vnc.html` - Serves web-based VNC viewer

### Database Integration
The system utilizes the existing `machines` table with these fields:
- `id` - Machine identifier
- `name` - Machine display name
- `ip_address` - Target IP for connections
- `username` - Stored login username
- `encrypted_password` - Stored login password
- `is_active` - Online/offline status

### Web-based VNC Viewer
- **Location**: `backend/public/vnc.html` 
- **Features**:
  - Custom VNC interface designed for LANtern
  - Fullscreen support
  - Ctrl+Alt+Del functionality
  - Connection status indicators
  - Responsive design for all screen sizes

## 🔐 Security Features

### Credential Management
1. **Database Storage**: Credentials stored in encrypted format in MySQL
2. **Automatic Retrieval**: No manual credential entry required
3. **Session Security**: Temporary session tokens for web connections
4. **Access Control**: Machine availability checks before connection attempts

### Connection Security
1. **IP Validation**: Connections only to registered machine IPs
2. **Status Verification**: Online status check before connection
3. **Protocol Security**: Uses native secure protocols (RDP/VNC encryption)
4. **Session Management**: Proper session cleanup and timeout handling

## 🎨 User Experience

### Visual Interface
- **Modern Design**: Card-based interface with connection method visualization
- **Status Indicators**: Real-time online/offline status with animations
- **Quick Access**: One-click connection buttons with loading states
- **Responsive Layout**: Works on desktop, tablet, and mobile devices

### Error Handling
- **Connection Failures**: Clear error messages with troubleshooting tips
- **Offline Detection**: Visual warnings when target machines are offline
- **Credential Issues**: Alerts for missing or invalid credentials
- **Network Problems**: Timeout handling with retry options

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
