import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Achat — bons de commande fournisseur édités par
 * le service achat à partir des devis transférés.
 * (NumAchat, DateAchat, TotalHT, TotalTVA, TotalTTC, Fournisseur,
 *  StatutAchat, ModeReglement, Banque, ContactF, NumChéque, DateLivraison,
 *  Durée, saisiePar, TotalPayé, ResteApaye, IDFOURNISSEUR, NumAchatProfor,
 *  Taux, NumCommande, NumComm, ServiceComptable, ComptaEnvoiele,
 *  ComptaEnvoiepar, Chéqueedité, AgentUtilisateur, IDpaementFournisseur,
 *  DeviseM)
 */
export interface IAchat extends Document {
  numAchat: string;
  dateAchat: Date;
  totalHT: number;
  totalTVA?: number;
  totalTTC: number;
  fournisseur?: string;
  fournisseurId?: Types.ObjectId;
  statutAchat?: string; // brouillon | transfere_compta | paye | annule
  modeReglement?: string;
  banque?: string;
  contactF?: string;
  numCheque?: string;
  dateLivraison?: Date;
  duree?: string;
  saisiePar?: string;
  totalPaye?: number;
  resteAPaye?: number;
  numAchatProfor?: string;
  taux?: number;
  commandeId?: Types.ObjectId;
  numCommande?: string;
  numComm?: string;
  serviceComptable?: boolean;
  comptaEnvoieLe?: Date;
  comptaEnvoiePar?: string;
  chequeEdite?: boolean;
  agentUtilisateur?: string;
  paiementFournisseurId?: Types.ObjectId;
  deviseM?: string;
}

const AchatSchema = new Schema<IAchat>(
  {
    numAchat: { type: String, required: true, unique: true },
    dateAchat: { type: Date, required: true, default: Date.now },
    totalHT: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    fournisseur: { type: String },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    statutAchat: { type: String, default: "brouillon" },
    modeReglement: { type: String },
    banque: { type: String },
    contactF: { type: String },
    numCheque: { type: String },
    dateLivraison: { type: Date },
    duree: { type: String },
    saisiePar: { type: String },
    totalPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    numAchatProfor: { type: String },
    taux: { type: Number, default: 0 },
    commandeId: { type: Schema.Types.ObjectId, ref: "Commande" },
    numCommande: { type: String },
    numComm: { type: String },
    serviceComptable: { type: Boolean, default: false },
    comptaEnvoieLe: { type: Date },
    comptaEnvoiePar: { type: String },
    chequeEdite: { type: Boolean, default: false },
    agentUtilisateur: { type: String },
    paiementFournisseurId: { type: Schema.Types.ObjectId, ref: "ReglementFournisseur" },
    deviseM: { type: String, default: "FCFA" },
  },
  { timestamps: true, collection: "achats" }
);

export const Achat: Model<IAchat> =
  (mongoose.models.Achat as Model<IAchat>) ||
  mongoose.model<IAchat>("Achat", AchatSchema);
