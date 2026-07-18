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
  console.warn("GMAIL_EMAIL or GMAIL_APP_PASSWORD not set; email API disabled.");
}

// Create Nodemailer transporter only when credentials are available.
const transporter =
  gmailEmail && gmailPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailEmail,
          pass: gmailPassword,
        },
      })
    : null;

app.use(express.json());
app.use(cors());

// ==================== EMAIL API ====================

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!transporter || !gmailEmail) {
      return res.status(503).json({ error: "Email service is not configured" });
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

app.use(
  express.static(path.join(__dirname, "dist"), {
    etag: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Email service ${transporter ? "ready" : "disabled"}`);
});
