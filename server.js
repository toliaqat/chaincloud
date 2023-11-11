const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3001;

function generateUniqueName() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    const charactersLength = characters.length;
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
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

app.get('/start-chain', (req, res) => {
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

        exec(`CONTAINER_NAME=${uniqueName} docker-compose -p ${uniqueName} up -d`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error starting container ${uniqueName}:`, error);
                return res.status(500).send(`Error starting container: ${error.message}`);
            }

            console.log(`Started container ${uniqueName}. Docker Compose Output: ${stdout}`);
            res.send(`Container started. Name: ${uniqueName}`);
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
