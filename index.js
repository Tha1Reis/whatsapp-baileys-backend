import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
} from "@whiskeysockets/baileys";
import express from "express";
import fs from "fs";
import { Boom } from "@hapi/boom";

// -----------------------------------------------------
//  Garante pasta AUTH no Railway
// -----------------------------------------------------
if (!fs.existsSync("./auth")) {
    fs.mkdirSync("./auth");
    console.log("Pasta 'auth' criada automaticamente!");
}

// -----------------------------------------------------
//  Inicialização do Express
// -----------------------------------------------------
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// -----------------------------------------------------
//  Função principal para inicia
