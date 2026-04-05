const axios = require('axios');

module.exports = async function(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'No query provided' });
    
    const FUSEKI_URL = process.env.FUSEKI_URL;
    if (!FUSEKI_URL) return res.status(500).json({ error: 'FUSEKI_URL not configured in Vercel Environment Variables.' });

    try {
        const response = await axios.post(FUSEKI_URL, query, {
            headers: { 'Content-Type': 'application/sparql-query' }
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message, details: error.response?.data });
    }
};
