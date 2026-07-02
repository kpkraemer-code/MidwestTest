const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Add this

const app = express();
const PORT = process.env.PORT || 3000;

// ====================== CONFIG ======================
const VERIFICATION_TOKEN = "MiDwEsT_dIeSeL_Kyle_kRaEmEr_ThisIsWild";
const ENDPOINT = "https://midwesttest-production.up.railway.app/webhook/ebay";

const EMAIL_TO = "kpkraemer@gmail.com";

// Nodemailer Setup (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,           // your Gmail
    pass: process.env.EMAIL_APP_PASSWORD    // Gmail App Password
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== CHALLENGE (GET) ======================
app.get('/webhook/ebay', (req, res) => {
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

        console.log('✅ Challenge responded successfully');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({ challengeResponse });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Error processing challenge');
    }
});

// ====================== NOTIFICATION (POST) ======================
app.post('/webhook/ebay', async (req, res) => {
    console.log('=== eBay Notification Received ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const notification = req.body;

    // Check if it's an Order Confirmation
    if (notification.metadata?.topic === 'ORDER_CONFIRMATION' || 
        notification.notification?.data?.order) {

        const order = notification.notification?.data?.order || notification.order;
        const user = notification.notification?.data?.user;

        console.log(`✅ ORDER_CONFIRMATION detected! Order ID: ${order?.orderId}`);

        // Send Email
        const mailOptions = {
            from: `"eBay Orders" <${process.env.EMAIL_USER}>`,
            to: EMAIL_TO,
            subject: `🛒 New eBay Order #${order?.orderId || 'Unknown'}`,
            html: `
                <h2>New Order Received on eBay</h2>
                <p><strong>Order ID:</strong> ${order?.orderId || 'N/A'}</p>
                <p><strong>Seller:</strong> ${user?.username || user?.userId || 'N/A'}</p>
                <p><strong>Time:</strong> ${notification.notification?.eventDate || new Date().toISOString()}</p>
                
                <h3>Items:</h3>
                <ul>
                    ${(order?.orderLineItems || []).map(item => `
                        <li>
                            <strong>Listing ID:</strong> ${item.listingId}<br>
                            <strong>Line Item:</strong> ${item.orderLineItemId}<br>
                            <strong>Quantity:</strong> ${item.quantity}
                        </li>
                    `).join('') || '<li>No items found</li>'}
                </ul>
                <hr>
                <p><small>This email was sent automatically from your eBay webhook.</small></p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${EMAIL_TO}`);
        } catch (emailErr) {
            console.error('❌ Failed to send email:', emailErr);
        }
    }

    // Always respond quickly
    res.status(200).send('OK');
});

app.listen(PORT, () => {
    console.log(`eBay webhook listening on port ${PORT}`);
    console.log(`Emails will be sent to: ${EMAIL_TO}`);
});
