# LANturn 🔦

A comprehensive network power management system that allows you to remotely control (wake up, shutdown, restart) machines on your Local Area Network (LAN). Built with React frontend and Express.js backend with MySQL database support.

## 🚀 Features

- **Machine Management**: Add, configure, and manage network machines
- **Remote Power Control**: Wake-on-LAN (WoL), shutdown, and restart machines remotely
- **Cluster Management**: Group machines into clusters for bulk operations
- **Power Event Logging**: Track all power management activities
- **Modern UI**: Responsive React-based interface with Bootstrap styling
- **Secure Authentication**: Password-protected operations with encrypted storage

## 🏗️ Architecture

```
LANturn/
├── frontend/          # React.js application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Main application pages
│   │   └── App.js         # Main application component
│   └── package.json
├── backend/           # Express.js API server
│   ├── server.js          # Main server file
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 19.1.0** - Modern UI library
- **React Router** - Client-side routing
- **Bootstrap 5.3.7** - Responsive styling framework
- **React Bootstrap** - Bootstrap components for React
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Express.js 5.1.0** - Web application framework
- **MySQL2** - Database connectivity
- **bcrypt** - Password encryption
- **CORS** - Cross-origin resource sharing
- **Wake-on-LAN (wol)** - Network wake functionality
- **dotenv** - Environment variable management

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **MySQL** database server
- **Network access** to target machines
- **Wake-on-LAN enabled** on target machines
- **Administrative privileges** for shutdown operations

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LANturn
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=power_management
DB_PORT=3306
```

### 3. Database Setup
Create the MySQL database and tables:
```sql
CREATE DATABASE power_management;
USE power_management;

CREATE TABLE machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    subnet_mask VARCHAR(15) DEFAULT '255.255.255.0',
    broadcast_address VARCHAR(15) NOT NULL,
    username VARCHAR(255),
    encrypted_password TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clusters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machine_cluster (
    machine_id INT,
    cluster_id INT,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
);

CREATE TABLE power_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT,
    action ENUM('wake', 'shutdown', 'restart') NOT NULL,
    status ENUM('success', 'failed') NOT NULL,
    initiated_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🏃‍♂️ Running the Application

### Start the Backend Server
```bash
cd backend
node server.js
```
The backend will run on `http://localhost:3001`

### Start the Frontend Development Server
```bash
cd frontend
npm start
```
The frontend will run on `http://localhost:3000`

## 📖 Usage

### Adding Machines
1. Navigate to the **Machines** page
2. Click **Add Machine**
3. Fill in the machine details:
   - **Name**: Friendly name for the machine
   - **MAC Address**: Network MAC address (for Wake-on-LAN)
   - **IP Address**: Machine's IP address
   - **Broadcast Address**: Network broadcast address
   - **Username/Password**: Admin credentials for remote operations

### Power Operations
- **Wake Up**: Send Wake-on-LAN packet to sleeping machines
- **Shutdown**: Remotely shutdown machines (requires admin credentials)
- **Restart**: Remotely restart machines (requires admin credentials)

### Cluster Management
1. Navigate to the **Clusters** page
2. Create clusters by grouping related machines
3. Perform bulk operations on entire clusters
4. Monitor cluster status and individual machine states

## 🔧 Configuration

### Environment Variables (Backend)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `` |
| `DB_NAME` | Database name | `power_management` |
| `DB_PORT` | MySQL port | `3306` |

### Network Requirements
- Machines must be on the same network segment for Wake-on-LAN
- Target machines need Wake-on-LAN enabled in BIOS/UEFI
- Administrative shares must be accessible for shutdown operations
- Firewall rules may need adjustment for remote operations

### Wake-on-LAN Optimization
The system uses an enhanced Wake-on-LAN implementation for better reliability:
- **Multiple packet transmission**: Sends 3 packets per target address
- **Multiple target addresses**: Uses broadcast address, global broadcast (255.255.255.255), and direct IP
- **Staggered timing**: 100ms delay between packets to prevent network congestion
- **Enhanced logging**: Detailed packet delivery tracking

### Performance Tips
1. **Network Infrastructure**:
   - Ensure network switches support WoL packet forwarding
   - Use managed switches with WoL pass-through enabled
   - Consider network segment isolation for better packet delivery

2. **Machine Configuration**:
   - Enable "Wake on Magic Packet" in BIOS/UEFI
   - Set network adapter to allow wake from powered-off state
   - Disable "Fast Startup" in Windows power settings
   - Configure "Power Management" tab in network adapter properties

3. **Broadcast Address Configuration**:
   - Use subnet-specific broadcast address (e.g., 192.168.1.255 for 192.168.1.0/24)
   - Verify broadcast address matches your network configuration
   - Test with global broadcast (255.255.255.255) if subnet broadcast fails

## 🔒 Security Considerations

- Passwords are encrypted using bcrypt before storage
- Network operations require proper credentials
- Consider running on a secure, isolated network
- Implement proper network security measures
- Regular security audits recommended

## 🐛 Troubleshooting

### Common Issues

**Wake-on-LAN not working or slow:**
- Ensure WoL is enabled in machine BIOS/UEFI settings
- Check that "Wake on Magic Packet" is specifically enabled
- Verify network switch supports WoL packet forwarding
- Confirm broadcast address is correctly configured for your subnet
- Disable Windows "Fast Startup" feature
- Set network adapter power management to "Allow this device to wake the computer"
- Try different broadcast addresses (subnet-specific vs global broadcast)
- Check if network adapter supports WoL while computer is completely powered off

**Enhanced WoL features:**
- System now sends multiple packets (3x) to improve reliability
- Uses multiple target addresses: subnet broadcast, global broadcast, and direct IP
- Packets are staggered with 100ms delays to prevent network flooding
- Monitor backend logs for packet delivery status

**Shutdown operations failing:**
- Verify admin credentials are correct
- Check network connectivity to target machine
- Ensure Windows Admin shares are enabled
- Firewall may be blocking connections

**Database connection issues:**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database and tables exist

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [Wake-on-LAN npm package](https://www.npmjs.com/package/wol)
- [React Bootstrap](https://react-bootstrap.github.io/)
- [Express.js](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)

---

**Note**: This application is designed for trusted network environments. Always follow your organization's security policies when implementing network management tools.
