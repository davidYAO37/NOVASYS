import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table CLIENT_Commande_Paiement — encaissements des
 * clients sur leurs commandes/factures.
 * (IDClient_NumCommande, DatePaiement, HeureAjout, PayéPar, RecuDe,
 *  MontantPayé, IDClient, NumCommande, ModeReglement, TotalTTC, ResteApaye,
 *  ClientC, Banque, NumChéque, NUmViremelnt, NumComm, ObjetCommande,
 *  DeviseM, NuméroFactBL, IDFacture)
 */
export interface IPaiementClient extends Document {
  datePaiement: Date;
  heureAjout?: string;
  payePar?: string;
  recuDe?: string;
  montantPaye: number;
  clientId?: Types.ObjectId;
  commandeId?: Types.ObjectId;
  numCommande?: string;
  modeReglement?: string;
  totalTTC?: number;
  resteAPaye?: number;
  clientC?: string;
  banque?: string;
  numCheque?: string;
  numVirement?: string;
  numTel?: string;
  numComm?: string;
  objetCommande?: string;
  deviseM?: string;
  numeroFactBL?: string;
  factureId?: Types.ObjectId;
  annule?: boolean;
}

const PaiementClientSchema = new Schema<IPaiementClient>(
  {
    datePaiement: { type: Date, required: true, default: Date.now },
    heureAjout: { type: String },
    payePar: { type: String },
    recuDe: { type: String },
    montantPaye: { type: Number, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    commandeId: { type: Schema.Types.ObjectId, ref: "Commande" },
    numCommande: { type: String },
    modeReglement: { type: String },
    totalTTC: { type: Number },
    resteAPaye: { type: Number },
    clientC: { type: String },
    banque: { type: String },
    numCheque: { type: String },
    numVirement: { type: String },
    numTel: { type: String },
    numComm: { type: String },
    objetCommande: { type: String },
    deviseM: { type: String, default: "FCFA" },
    numeroFactBL: { type: String },
    factureId: { type: Schema.Types.ObjectId, ref: "FactureClient" },
    annule: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "paiementsclients" }
);

export const PaiementClient: Model<IPaiementClient> =
  (mongoose.models.PaiementClient as Model<IPaiementClient>) ||
  mongoose.model<IPaiementClient>("PaiementClient", PaiementClientSchema);
