import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.resolve(__dirname, "public")));
app.get("*", (_req, res) => res.sendFile(path.resolve(__dirname, "public", "index.html")));
app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`));
