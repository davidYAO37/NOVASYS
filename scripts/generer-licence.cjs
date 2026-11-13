#!/usr/bin/env node
/**
 * Génération d'une clé de licence NOVASYS (côté éditeur, hors ligne).
 *
 * Usage :
 *   LICENCE_SECRET=xxx node scripts/generer-licence.cjs [--days 365] [--modules clients,devis,...]
 *
 *   --days N    : licence avec expiration dans N jours (omis = perpétuelle)
 *   --modules   : liste de codes séparés par des virgules (omis = tous)
 *
 * La clé est signée HMAC-SHA256 avec LICENCE_SECRET ; elle doit ensuite
 * être saisie dans NOVASYS → Administration → Licence → « Activer une licence ».
 */
const { createHmac } = require("crypto");

const MODULES = [
  "accueil", "clients", "fournisseurs", "devis", "service_achat",
  "emission_cheque", "factures", "caisse", "stock", "parametrage",
];

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const secret = process.env.LICENCE_SECRET;
if (!secret) {
  console.error("Erreur : définissez LICENCE_SECRET (identique à celui du serveur).");
  process.exit(1);
}

const days = opt("days") !== undefined ? Math.max(parseInt(opt("days"), 10) || 0, 1) : null;
const modules = opt("modules")
  ? opt("modules").split(",").map((m) => m.trim()).filter((m) => MODULES.includes(m))
  : MODULES;

const payload = {
  id: "novasys",
  type: opt("trial") !== undefined ? "trial" : "paid",
  status: "active",
  end: days ? new Date(Date.now() + days * 86400000).toISOString() : undefined,
  modules,
};

const signature = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
const key = Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64url");

console.log("=== Clé de licence NOVASYS ===");
console.log(key);
console.log("=============================");
console.log(`Type : ${payload.type} | Expiration : ${payload.end || "perpétuelle"} | Modules : ${modules.length}`);
