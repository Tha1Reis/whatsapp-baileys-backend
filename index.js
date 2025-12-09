import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from "@whiskeysockets/baileys";
import express from "express";
import fs from "fs";
import { Boom } from "@hapi/boom";

// LOG EXTRA
console.log("🚀 Iniciando servidor...");

// Garante pasta AUTH
if (!fs.existsSync("./auth")) {
    fs.mkdirSync("./auth");
    console.log("Pasta 'auth' criada automaticamente!");
} else {
    console.log("Pasta 'auth' já existia.");
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// FUNÇÃO WHATSAPP
async function iniciarWhatsapp() {
    console.log("📄 Carregando credenciais...");

    let state, saveCreds;
    try {
        const auth = await useMultiFileAuthState("./auth");
        state = auth.state;
        saveCreds = auth.saveCreds;
        console.log("✔ Credenciais carregadas.");
    } catch (err) {
        console.error("❌ Erro ao carregar credenciais:", err);
        return;
    }

    console.log("🔌 Iniciando conexão com o WhatsApp...");

    let sock;
    try {
        sock = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            browser: ["Railway", "Chrome", "1.0"],
        });
    } catch (err) {
        console.error("❌ Erro ao criar socket:", err);
        return;
    }

    sock.ev.on("creds.update", saveCreds);

    // EVENTOS
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        console.log("📡 Evento de conexão:", update);

        if (connection === "open") {
            console.log("🎉 WhatsApp conectado com sucesso!");
        }

        if (connection === "close") {
            const reason =
                new Boom(lastDisconnect?.error)?.output?.statusCode;

            console.log("❌ Conexão perdida:", reason);

            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Recarregando conexão...");
                iniciarWhatsapp();
            } else {
                console.log("⚠ Login expirado. Escaneie o QR novamente.");
            }
        }
    });

    return sock;
}

let client;

// CHAMADA PRINCIPAL
iniciarWhatsapp()
    .then((c) => {
        console.log("✨ Cliente WhatsApp inicializado:", !!c);
        client = c;
    })
    .catch((err) => console.error("❌ Erro geral:", err));

// ROTA TESTE
app.get("/", (req, res) => {
    res.send("API OK 🚀");
});

// ROTA ENVIO
app.post("/send", async (req, res) => {
    try {
        if (!client) return res.status(500).json({ error: "WA não iniciado." });

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
