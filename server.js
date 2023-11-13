const https = require('https');
const fs = require('fs');
const express = require('express');
const { exec, execFile } = require('child_process');
const app = express();
const port = 443;

function generateUniqueName() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    const charactersLength = characters.length;
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function isValidContainerName(input) {
    const validInputRegex = /^[a-zA-Z0-9]+$/;
    return validInputRegex.test(input);
}

function checkRunningContainers(callback) {
    exec('docker ps -q', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return callback(error, null);
        }

        const containerCount = stdout.split('\n').filter(line => line).length;
        callback(null, containerCount);
    });
}

// GET /chain
app.get('/chain', (req, res) => {
    console.log('Received request to start a new container');

    checkRunningContainers((err, count) => {
        if (err) {
            console.error('Error checking running containers:', err);
            return res.status(500).send('Error checking running containers');
        }

        console.log(`Currently running containers: ${count}`);

        if (count >= 10) {
            console.log('Container limit reached, sending retry message');
            return res.send('Server is currently loaded. Please retry after a few minutes.');
        }

        const uniqueName = generateUniqueName();

        exec(`CONTAINER_NAME=${uniqueName} docker compose -p ${uniqueName} up -d`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error starting container ${uniqueName}:`, error);
                return res.status(500).send(`Error starting container: ${error.message}`);
            }

            cName = `${uniqueName}-agd-1`

            console.log(`Started container ${cName}`);
            res.json({ containerName: cName });
        });
    });
});

// GET /logs
app.get('/logs', (req, res) => {
    const containerName = req.query.containerName;
    
    if (!containerName) {
        return res.status(400).json({ error: 'Container name is required' });
    }

    if (!isValidContainerName(containerName)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }

    exec(`docker logs -n 10 ${containerName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error fetching logs for container ${containerName}:`, error);
            return res.status(500).json({ error: `Error fetching logs: ${error.message}` });
        }

        res.json({ containerName: containerName, logs: stdout });
    });
});


// GET /agd
app.get('/agd', (req, res) => {
    
    const containerName = req.query.containerName;
    const agdParams = req.query.agdParams;

    if (!containerName) {
        return res.status(400).json({ error: 'Container name is required' });
    }

    if (!agdParams) {
        return res.status(400).json({ error: 'Agd parameters are required' });
    }

    if (!isValidContainerName(containerName)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }

    execFile('docker', ['exec', containerName, 'agd'].concat(agdParams.split(' ')), (error, stdout, stderr) => {
        if (error) {
            console.error(`Error running agd in the agoric chain container ${containerName}:`, error);
            return res.status(500).json({ error: `Error fetching logs: ${error.message}` });
        }

        res.json({ containerName: containerName, logs: stdout });
    });
});


// GET /keys
app.get('/keys', (req, res) => {
    
    const containerName = req.query.containerName;
    if (!containerName) {
        return res.status(400).json({ error: 'Container name is required' });
    }

    if (!isValidContainerName(containerName)) {
        return res.status(400).json({ error: 'Invalid container name' });
    }

    exec(`docker exec ${containerName} /bin/bash -c 'source env_setup.sh && printKeys' `, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error fetching test keys from container ${containerName}:`, error);
            return res.status(500).json({ error: `Error fetching logs: ${error.message}` });
        }

        res.json({ containerName: containerName, keys: stdout });
    });
});


const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
