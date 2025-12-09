import express from "express";
import cors from "cors";
import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";

const app = express();
app.use(cors());
app.use(express.json());

let sock;
let qrCodeImage = null;

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  // IGNORA mensagens recebidas
  sock.ev.on("messages.upsert", () => {});

  // Atualiza QR
  sock.ev.on("connection.update", async (update) => {
    if (update.qr) {
      qrCodeImage = await QRCode.toDataURL(update.qr);
    }
  });
}

connectWhatsApp();

app.get("/", (req, res) => {
  res.send("API WhatsApp Online!");
});

// ROTA PARA PEGAR O QR
app.get("/qr", (req, res) => {
  res.json({ qr: qrCodeImage });
});

// ENVIAR MENSAGEM
app.post("/send", async (req, res) => {
  try {
    const { number, message } = req.body;

    await sock.sendMessage(number + "@s.whatsapp.net", { text: message });

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("API Rodando!");
});
