import express from "express";
import cors from "cors";
import PayHero from "payhero-wrapper";

const app = express();
app.use(express.json());

// ✅ Allow ALL frontend origins (TikTok, websites, apps, etc.)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ================= PAYHERO CONFIG (HARDCODED FOR TESTING) =================

const PayHeroConfig = {
  Authorization: "R2t0RE5KaEIwdkRob001d2xCVXU6S1VEdmVRMmF3OEpuSU9aSlhVRmZvTEI4SG9XQWFPekU0UnozTmpTRQ==",
};

const payhero = new PayHero(PayHeroConfig);

// ================= STK PUSH FUNCTION WITH AUTO RETRY =================

async function stkPushWithRetry(details, retries = 3) {
  try {
    console.log("🚀 Sending STK Push:", details);

    const response = await payhero.makeStkPush(details);

    console.log("✅ STK Push Success:", response);
    return response;

  } catch (error) {
    console.error("❌ STK Push Failed:", error?.response?.data || error.message);

    if (retries > 0) {
      console.log(`🔄 Retrying STK Push... Attempts left: ${retries}`);
      await new Promise(r => setTimeout(r, 3000)); // wait 3 seconds
      return stkPushWithRetry(details, retries - 1);
    }

    throw error;
  }
}

// ================= API ENDPOINT =================

app.post("/stk-push", async (req, res) => {
  try {
    const { phone, amount, reference } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "Phone and amount required" });
    }

    const paymentDetails = {
      amount: amount,
      phone_number: phone,
      channel_id: 3572, // YOUR CHANNEL ID
      provider: "m-pesa",
      external_reference: reference || "INV-" + Date.now(),
      callback_url: "https://yourdomain.com/payhero-callback"
    };

    const result = await stkPushWithRetry(paymentDetails);

    res.json({
      success: true,
      message: "STK Push sent",
      data: result
    });

  } catch (error) {
    console.error("🔥 FINAL ERROR:", error?.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: "STK push failed after retries"
    });
  }
});

// ================= CALLBACK ENDPOINT =================

app.post("/payhero-callback", (req, res) => {
  console.log("📩 PayHero Callback Received:", req.body);
  res.sendStatus(200);
});

// ================= SERVER START =================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ PayHero server running on port ${PORT}`);
});
