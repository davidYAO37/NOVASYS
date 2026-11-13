import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table FactureClient — factures éditées à partir des
 * proformas (le bon de livraison est créé automatiquement à
 * l'enregistrement).
 * (IDFacture, DateFacture, HeureAjout, TotalHTFacture, MainDoeuvre, Remise,
 *  totalavecremise, TotalTVA, TotalTTC, TotalPayé, ResteApaye, StatutC,
 *  saisiePar, IDClient, ObjetFacture, NumComm, NumCommande, TauxRemise,
 *  Taux, ClientC, Mail, ContactC, AdresseGéo, ServiceAchat,
 *  ObservationFacture, NumBONFacture, DeviseM, DateLivraison,
 *  AgentUtilisateur, ModeReglement)
 */
export interface IFactureClient extends Document {
  numFacture: string;
  dateFacture: Date;
  heureAjout?: string;
  totalHTFacture: number;
  mainDoeuvre?: number;
  remise?: number;
  totalAvecRemise?: number;
  totalTVA?: number;
  totalTTC: number;
  totalPaye?: number;
  resteAPaye?: number;
  statutC?: string; // en_attente | partielle | soldee | annulee
  saisiePar?: string;
  clientId?: Types.ObjectId;
  objetFacture?: string;
  numComm?: string;
  commandeId?: Types.ObjectId;
  numCommande?: string;
  tauxRemise?: number;
  taux?: number;
  clientC?: string;
  mail?: string;
  contactC?: string;
  adresseGeo?: string;
  serviceAchat?: string;
  observationFacture?: string;
  numBonFacture?: string;
  deviseM?: string;
  dateLivraison?: Date;
  agentUtilisateur?: string;
  modeReglement?: string;
}

const FactureClientSchema = new Schema<IFactureClient>(
  {
    numFacture: { type: String, required: true, unique: true },
    dateFacture: { type: Date, required: true, default: Date.now },
    heureAjout: { type: String },
    totalHTFacture: { type: Number, default: 0 },
    mainDoeuvre: { type: Number, default: 0 },
    remise: { type: Number, default: 0 },
    totalAvecRemise: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    totalPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    statutC: { type: String, default: "en_attente" },
    saisiePar: { type: String },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    objetFacture: { type: String },
    numComm: { type: String },
    commandeId: { type: Schema.Types.ObjectId, ref: "Commande" },
    numCommande: { type: String },
    tauxRemise: { type: Number, default: 0 },
    taux: { type: Number, default: 0 },
    clientC: { type: String },
    mail: { type: String },
    contactC: { type: String },
    adresseGeo: { type: String },
    serviceAchat: { type: String },
    observationFacture: { type: String },
    numBonFacture: { type: String },
    deviseM: { type: String, default: "FCFA" },
    dateLivraison: { type: Date },
    agentUtilisateur: { type: String },
    modeReglement: { type: String },
  },
  { timestamps: true, collection: "factures" }
);

export const FactureClient: Model<IFactureClient> =
  (mongoose.models.FactureClient as Model<IFactureClient>) ||
  mongoose.model<IFactureClient>("FactureClient", FactureClientSchema);
