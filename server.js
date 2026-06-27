import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Midtrans from "midtrans-client";

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

// Midtrans configuration
const midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
const midtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
const midtransMerchantId = process.env.MIDTRANS_MERCHANT_ID;
const paymentMode = process.env.PAYMENT_MODE || "live"; // "test" or "live"

if (!midtransServerKey || !midtransClientKey || !midtransMerchantId) {
  console.warn("⚠️  Warning: Midtrans credentials not found in .env. Payment features disabled.");
}

// Initialize Midtrans Snap client
const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: midtransServerKey,
  clientKey: midtransClientKey,
});

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

// ==================== MIDTRANS PAYMENT API ====================

app.post("/api/payment/create-transaction", async (req, res) => {
  try {
    const { member, amount, type } = req.body;

    if (!member || !amount || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = `${type}_${member}_${Date.now()}`;

    // TEST MODE - return mock token
    if (paymentMode === "test") {
      console.log(`🧪 TEST MODE: Payment token created for ${member} - Rp ${amount.toLocaleString("id-ID")}`);
      return res.json({
        success: true,
        token: `test_token_${orderId}`,
        redirect_url: `https://app.sandbox.midtrans.com/snap/v2/${orderId}`,
        orderId: orderId,
      });
    }

    // LIVE MODE - use real Midtrans
    if (!midtransServerKey) {
      return res.status(500).json({ error: "Midtrans not configured" });
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: member,
        email: "customer@example.com",
      },
      item_details: [
        {
          id: type === "topup" ? "TOPUP" : "WITHDRAWAL",
          price: amount,
          quantity: 1,
          name: type === "topup" ? "Account Top-up (IDR)" : "Withdrawal Request (IDR)",
        },
      ],
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      orderId: orderId,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({
      error: error.message || "Failed to create payment",
    });
  }
});

app.post("/api/payment/check-status", async (req, res) => {
  try {
    if (!midtransServerKey) {
      return res.status(500).json({ error: "Midtrans not configured" });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const statusResponse = await snap.transaction.status(orderId);

    res.json({
      success: true,
      status: statusResponse.transaction_status,
      orderId: orderId,
      grossAmount: statusResponse.gross_amount,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      error: error.message || "Failed to check payment status",
    });
  }
});

app.post("/api/payment/notification", async (req, res) => {
  try {
    const notification = req.body;
    console.log("✓ Payment notification received:", notification);
    res.json({ success: true });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ error: "Notification failed" });
  }
});

app.post("/api/payment/recurring-notification", async (req, res) => {
  try {
    const notification = req.body;
    console.log("✓ Recurring notification received:", notification);
    res.json({ success: true });
  } catch (error) {
    console.error("Recurring notification error:", error);
    res.status(500).json({ error: "Notification failed" });
  }
});

app.post("/api/payment/pay-account-notification", async (req, res) => {
  try {
    const notification = req.body;
    console.log("✓ Pay account notification received:", notification);
    res.json({ success: true });
  } catch (error) {
    console.error("Pay account notification error:", error);
    res.status(500).json({ error: "Notification failed" });
  }
});

// ==================== SERVE REACT ====================

app.use(express.static(path.join(__dirname, "dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Payment mode: ${paymentMode === "test" ? "🧪 TEST (mock)" : "💳 LIVE (Midtrans)"}`);
});
