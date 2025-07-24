    const establishDirectControlConnection = async (connection) => {
        try {
            setAlert({
                show: true,
                message: `Establishing direct control connection to ${machine.name}...`,
                variant: 'info'
            });

            // Try the new direct launch endpoint first
            try {
                const launchResponse = await axios.post(`${API_BASE_URL}/remote-access/launch-rdp`, {
                    machineId: machine.id,
                    mode: 'control'
                });

                if (launchResponse.data.success && launchResponse.data.method === 'direct_launch') {
                    setAlert({
                        show: true,
                        message: `Remote Desktop Control Launched Successfully! The RDP connection has been launched directly on your system. You should see the RDP window opening shortly with automatic authentication. You now have complete control of ${machine.name} at ${machine.ip_address}.`,
                        variant: 'success'
                    });

                    setTimeout(() => onHide(), 3000);
                    return;
                }
            } catch (launchError) {
                console.log('Direct launch failed, trying fallback method...', launchError);
            }

            // Fallback method: Create RDP file and try to open it directly
            const rdpContent = createRdpFileContent(connection, 'control');
            const blob = new Blob([rdpContent], { type: 'application/rdp' });
            const rdpUrl = URL.createObjectURL(blob);
            
            // Try to trigger RDP file execution without download
            const tempLink = document.createElement('a');
            tempLink.href = rdpUrl;
            tempLink.style.display = 'none';
            tempLink.download = `${machine.name}_control.rdp`;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            
            setAlert({
                show: true,
                message: `RDP Control Connection Initiated! Your system should open the RDP connection automatically to ${machine.name} (${machine.ip_address}). You will have full control of the remote desktop. The remote user will see all your actions.`,
                variant: 'success'
            });

            setTimeout(() => URL.revokeObjectURL(rdpUrl), 5000);
            setTimeout(() => onHide(), 4000);

        } catch (error) {
            console.error('Direct control connection failed:', error);
            setAlert({
                show: true,
                message: `Failed to establish direct control connection: ${error.message}. Falling back to file download method.`,
                variant: 'warning'
            });
            
            downloadAndLaunchRdp(connection, 'control');
        }
    };
