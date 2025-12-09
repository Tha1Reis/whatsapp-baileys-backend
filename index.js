import express from "express";
import cors from "cors";
import { makeWASocket, useMultiFileAuthState, Browsers } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Garantir que a pasta auth existe
if (!fs.existsSync("./auth")) {
  fs.mkdirSync("./auth");
  console.log("Pasta auth criada!");
}

let sock;
let qrCodeImage = null;

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Safari") // mais estável
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrCodeImage = await QRCode.toDataURL(qr);
      console.log("QR gerado!");
    }

    if (connection === "open") {
      console.log("Conectado ao WhatsApp!");
    }

    if (connection === "close") {
      console.log("Conexão perdida, tentando reconectar...");
      connectWhatsApp();
    }
  });
}

connectWhatsApp();

app.get("/", (req, res) => {
  res.send("API WhatsApp Online!");
});

// Rota para pegar QR
app.get("/qr", (req, res) => {
  res.json({ qr: qrCodeImage });
});

// Rota para enviar mensagens
app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;

    await sock.sendMessage(`${number}@s.whatsapp.net`, { text: message });

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("API Rodando!")
);
