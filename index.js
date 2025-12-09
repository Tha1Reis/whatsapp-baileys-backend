import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from "@whiskeysockets/baileys";
import express from "express";
import fs from "fs";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";

// VARIÁVEL GLOBAL PARA GUARDAR QR
let latestQR = null;

// Iniciando servidor
console.log("🚀 Iniciando servidor...");

// Garante pasta AUTH
if (!fs.existsSync("./auth")) {
    fs.mkdirSync("./auth");
    console.log("Pasta 'auth' criada automaticamente!");
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

async function iniciarWhatsapp() {
    console.log("📄 Carregando credenciais...");

    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        printQRInTerminal: false, // DESATIVA QR NO TERMINAL
        auth: state,
        browser: ["Railway", "Chrome", "1.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        console.log("📡 Evento de conexão:", update);

        // Se chegou QR, salvamos para exibir no navegador
        if (qr) {
            latestQR = await QRCode.toDataURL(qr);
            console.log("🔑 QR atualizado e pronto na rota /qr");
        }

        if (connection === "open") {
            console.log("🎉 WhatsApp conectado com sucesso!");
            latestQR = null; // Limpa o QR após login
        }

        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log("❌ Conexão perdida:", reason);

            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Tentando reconectar...");
                iniciarWhatsapp();
            } else {
                console.log("⚠ Login expirado. Novo QR será gerado.");
            }
        }
    });

    return sock;
}

let client;

// Inicializa WhatsApp
iniciarWhatsapp().then((c) => {
    console.log("✨ Cliente WhatsApp inicializado");
    client = c;
});

// ROTA TESTE
app.get("/", (req, res) => {
    res.send("API OK 🚀");
});

// ROTA PARA VER QR NO NAVEGADOR
app.get("/qr", (req, res) => {
    if (!latestQR) {
        return res.send(`
            <h2>🤖 Nenhum QR disponível agora</h2>
            <p>Se o WhatsApp já estiver conectado, o QR some.</p>
            <p>Se estiver carregando, recarregue esta página.</p>
        `);
    }

    res.send(`
        <h2>📱 Escaneie para conectar ao WhatsApp</h2>
        <img src="${latestQR}" />
        <p>Atualize a página se o QR mudar.</p>
    `);
});

// ROTA PARA ENVIAR MENSAGEM
app.post("/send", async (req, res) => {
    try {
        if (!client) return res.status(500).json({ error: "WA não iniciado" });

        const { number, message } = req.body;
        const jid = `${number}@s.whatsapp.net`;

        await client.sendMessage(jid, { text: message });

        res.json({ status: "ok" });
    } catch (err) {
        console.error("❌ Erro ao enviar:", err);
        res.status(500).json({ error: err.toString() });
    }
});

app.listen(PORT, () => console.log(`🌐 API rodando na porta ${PORT}`));
