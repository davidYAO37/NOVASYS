import type { Connection } from "mongoose";
import { hashPassword, generateLocalUID } from "@/utils/auth";

/**
 * Données par défaut injectées au premier démarrage
 * (équivalent WinDev : création des profils et du compte administrateur).
 */
export async function seedDefaultDataForConnection(conn: Connection) {
  const created: string[] = [];

  // Import dynamique : les modèles sont déjà enregistrés via ../models
  const { User } = await import("@/models/users.model");
  const { Profil } = await import("@/models/profil");
  const { Entreprise } = await import("@/models/entreprise");
  const { Operation } = await import("@/models/operation");
  const { Licence, DateControle } = await import("@/models/licence");
  const { Famille } = await import("@/models/famille");

  // Profils WinDev
  const profils = ["Administrateur", "Commercial", "Service Achat", "Comptabilité", "Caisse"];
  for (const p of profils) {
    const exists = await Profil.findOne({ profil: p });
    if (!exists) {
      await Profil.create({ profil: p });
      created.push(`profil:${p}`);
    }
  }

  // Compte administrateur par défaut (à changer à la première connexion)
  const adminExists = await User.findOne({ email: "admin@novasys.local" });
  if (!adminExists) {
    await User.create({
      nom: "Administrateur",
      prenom: "NOVASYS",
      name: "Administrateur NOVASYS",
      email: "admin@novasys.local",
      password: await hashPassword("admin123"),
      type: "admin",
      uid: generateLocalUID(),
    });
    created.push("user:admin@novasys.local");
  }

  // Fiche entreprise unique — démarre en période d'essai 30 jours
  // (équiv. WinDev Licence.essai + DATECONTROLE ; la licence est ensuite
  // activée par clé depuis Administration → Licence).
  const entExists = await Entreprise.findOne();
  if (!entExists) {
    const finEssai = new Date();
    finEssai.setDate(finEssai.getDate() + 30);
    await Entreprise.create({
      nomSociete: "NOVASYS",
      licenceType: "trial",
      licenceStatus: "active",
      licenceStartDate: new Date(),
      licenceEndDate: finEssai,
    });
    created.push("entreprise");
  } else if (!entExists.licenceType) {
    const finEssai = new Date();
    finEssai.setDate(finEssai.getDate() + 30);
    await Entreprise.findByIdAndUpdate(entExists._id, {
      licenceType: "trial",
      licenceStatus: "active",
      licenceStartDate: new Date(),
      licenceEndDate: finEssai,
    });
    created.push("entreprise:licence-trial");
  }

  // Types d'opérations de caisse par défaut
  const ops: { libeleo: string; typeOp: string }[] = [
    { libeleo: "Encaissement client", typeOp: "entree" },
    { libeleo: "Décaissement fournisseur", typeOp: "sortie" },
    { libeleo: "Décaissement divers", typeOp: "sortie" },
    { libeleo: "Apport caisse", typeOp: "entree" },
  ];
  for (const op of ops) {
    const exists = await Operation.findOne({ libeleo: op.libeleo });
    if (!exists) {
      await Operation.create(op);
      created.push(`operation:${op.libeleo}`);
    }
  }

  // Licence (mode essai par défaut, comme FEN_Activation WinDev)
  const licExists = await Licence.findOne();
  if (!licExists) {
    await Licence.create({ essai: true, enregistreL: false });
    created.push("licence");
  }
  const dcExists = await DateControle.findOne();
  if (!dcExists) {
    await DateControle.create({ essaiC: true });
    created.push("datecontrole");
  }

  // Famille d'articles par défaut
  const famExists = await Famille.findOne({ libelle: "Divers" });
  if (!famExists) {
    await Famille.create({ libelle: "Divers" });
    created.push("famille:Divers");
  }

  return created;
}
