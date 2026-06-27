import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Required for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gmail SMTP configuration
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailEmail || !gmailPassword) {
  console.error("❌ Error: GMAIL_EMAIL or GMAIL_APP_PASSWORD not found in .env");
  process.exit(1);
}

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

app.use(express.json());
app.use(cors());

// ==================== EMAIL API ====================

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const info = await transporter.sendMail({
      from: gmailEmail,
      to,
      subject,
      html,
    });

    res.json({
      success: true,
      id: info.messageId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Failed to send email",
    });
  }
});

// ==================== SERVE REACT ====================

app.use(express.static(path.join(__dirname, "dist")));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});