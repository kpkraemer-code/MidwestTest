const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your own secret
const VERIFICATION_TOKEN = "your_very_long_verification_token_here_32_to_80_chars";
const ENDPOINT = "https://your-domain.com/webhook/ebay";   // Must match exactly what you send in createDestination

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ======================
// EBAY WEBHOOK ENDPOINT
// ======================
app.get('/webhook/ebay', (req, res) => {          // ← Challenge (GET request)
    const challengeCode = req.query.challenge_code;

    if (!challengeCode) {
        return res.status(400).send('Missing challenge_code');
    }

    try {
        const hash = crypto.createHash('sha256');
        hash.update(challengeCode);
        hash.update(VERIFICATION_TOKEN);
        hash.update(ENDPOINT);

        const challengeResponse = hash.digest('hex');

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ challengeResponse });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error processing challenge');
    }
});

app.post('/webhook/ebay', (req, res) => {         // ← Actual notifications (POST)
    console.log('=== eBay Notification Received ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // TODO: Add signature verification here (highly recommended)
    // Use eBay's official Node.js SDK for easier validation

    // Always return 200 OK quickly
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`eBay webhook listening on port ${PORT}`);
});
