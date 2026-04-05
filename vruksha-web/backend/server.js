const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware – order matters!
app.use(cors());
app.use(express.json());

// Optional logging – skip OPTIONS preflight
app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
        console.log(`${req.method} ${req.url}`);
    }
    next();
});

const FUSEKI_URL = 'http://localhost:3030/dsc/query';

// SPARQL proxy endpoint
app.post('/api/sparql', (req, res) => {
    console.log('Request body:', req.body);
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'No query provided' });
    }
    axios.post(FUSEKI_URL, query, {
        headers: { 'Content-Type': 'application/sparql-query' }
    })
    .then(response => res.json(response.data))
    .catch(error => {
        console.error('SPARQL error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: error.message,
            details: error.response?.data 
        });
    });
});

// AI chat endpoint
app.post('/api/chat', (req, res) => {
    console.log('Chat request body:', req.body);
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: 'Question required' });
    }

    const pythonScript = path.join(__dirname, '../../vruksha-ai-python/vruksha_assistant_api.py');
    const pythonExec = 'C:\\python\\python.exe'; // adjust if needed

    exec(`"${pythonExec}" "${pythonScript}" "${question}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: stderr });
        }
        try {
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (e) {
            res.json({ answer: stdout });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});