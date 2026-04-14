const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

let inMemoryDB = {
  users: [],
  leads: []
};

let mailTransport;

async function startServer() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (smtpHost && smtpUser && smtpPass) {
    mailTransport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    console.log('Using configured SMTP server for emails.');
  } else {
    // Use Ethereal Email for testing (free test mailboxes)
    const testAccount = await nodemailer.createTestAccount();
    mailTransport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('Using Ethereal Email for OTP delivery (test mode).');
    console.log('Preview OTP emails at: ' + nodemailer.getTestMessageUrl);
  }

  app.use(cors());
  app.use(express.json());
  
  // Error handling for JSON parsing
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON format.' });
    }
    next();
  });
  
  app.use(express.static(path.join(__dirname)));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'MiniCRM.html'));
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username and password are required.' });
    }

    const existingUser = inMemoryDB.users.find(u => u.email === email);

    if (existingUser) {
      if (existingUser.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      // Update username if changed
      existingUser.username = username;
    } else {
      // Create new user
      inMemoryDB.users.push({
        email,
        username,
        password,
        verifiedAt: new Date()
      });
    }

    res.json({ success: true, message: 'Login successful.' });
  });

  app.get('/api/leads', (req, res) => {
    res.json(inMemoryDB.leads.sort((a, b) => new Date(b.date) - new Date(a.date)));
  });

  app.post('/api/leads', (req, res) => {
    const lead = {
      id: 'L_' + Date.now(),
      name: req.body.name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      source: req.body.source || 'Website',
      status: req.body.status || 'new',
      notes: req.body.notes || [],
      date: new Date().toISOString()
    };
    inMemoryDB.leads.push(lead);
    res.json(lead);
  });

  app.put('/api/leads/:id', (req, res) => {
    const lead = inMemoryDB.leads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    Object.assign(lead, req.body);
    res.json(lead);
  });

  app.delete('/api/leads/:id', (req, res) => {
    inMemoryDB.leads = inMemoryDB.leads.filter(l => l.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/leads/:id/notes', (req, res) => {
    const lead = inMemoryDB.leads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    lead.notes.push({
      content: req.body.content || '',
      date: new Date().toISOString()
    });
    res.json(lead);
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.listen(port, () => {
    console.log(`MiniCRM server is running at http://localhost:${port}`);
    console.log('SMTP configured:', !!mailTransport);
  });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email, otp) {
  const info = await mailTransport.sendMail({
    from: process.env.SMTP_USER || '"MiniCRM" <noreply@minicrm.test>',
    to: email,
    subject: 'MiniCRM OTP Verification',
    text: `Your MiniCRM verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your MiniCRM verification code is <strong>${otp}</strong>.</p><p>This code will expire in 5 minutes.</p>`
  });
  console.log('OTP email sent to:', email);
  if (nodemailer.getTestMessageUrl) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Preview OTP at:', previewUrl);
  }
}

startServer().catch((error) => {
  console.error('Unable to start server:', error);
  process.exit(1);
});
