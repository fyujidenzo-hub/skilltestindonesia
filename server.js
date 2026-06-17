import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = express();

// Check if API key exists
const apiKey = process.env.VITE_RESEND_API_KEY;
if (!apiKey) {
  console.error("❌ Error: VITE_RESEND_API_KEY not found in .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);

app.use(express.json());
app.use(cors());

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📧 Sending email to: ${to}`);
    
    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: to,
      subject: subject,
      html: html,
    });

    if (response.error) {
      console.error("❌ Resend error:", response.error);
      return res.status(400).json({ error: response.error.message });
    }

    console.log(`✓ Email sent successfully to ${to}. ID: ${response.data.id}`);
    res.json({ success: true, id: response.data.id });
  } catch (error) {
    console.error("❌ Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Email server running on http://localhost:${PORT}`);
  console.log(`✓ API key loaded`);
  console.log(`📝 Add test emails at: https://resend.com/settings`);
});
