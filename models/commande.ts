import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Commande — en-tête des devis/proforma et
 * commandes clients. Une commande suit le cycle :
 *   saisie (commercial) → transférée au service achat → en cours → traitée.
 * Champs repris : NumCommande, DateCommande, HeureAjout, TotalHT,
 * MainDoeuvre, Remise, totalavecremise, TotalTVA, TotalTTC, TotalPayé,
 * ResteApaye, ClientC, ContactC, StatutC, ModeReglement, Banque, NumChéque,
 * saisiePar, IDClient, DelaisExécution, ValiditéBommande, ObjetCommande,
 * NumComm, DATEexeution, NumAchat, CachetDG, Garantie, TauxRemise, Taux,
 * Téléphone, Mail, BOitePostale, ServiceAchat, EnvoyéAchatPar, Envoyéle,
 * BonAchat, DeviseM, Factureéditée.
 */
export interface ICommande extends Document {
  numCommande: string;
  numComm?: string;
  dateCommande: Date;
  heureAjout?: string;
  totalHT: number;
  mainDoeuvre?: number;
  remise?: number;
  totalAvecRemise?: number;
  totalTVA?: number;
  totalTTC: number;
  totalPaye?: number;
  resteAPaye?: number;
  clientId?: Types.ObjectId;
  clientC?: string;
  contactC?: string;
  statutC?: string; // brouillon | envoyee | en_cours | traitee | annulee
  modeReglement?: string;
  banque?: string;
  numCheque?: string;
  saisiePar?: string;
  delaisExecution?: string;
  validiteCommande?: string;
  objetCommande?: string;
  dateExecution?: Date;
  numAchat?: string;
  cachetDG?: string;
  garantie?: string;
  tauxRemise?: number;
  taux?: number;
  telephone?: string;
  mail?: string;
  boitePostale?: string;
  serviceAchat?: boolean;
  envoyeAchatPar?: string;
  envoyeLe?: Date;
  bonAchat?: string;
  deviseM?: string;
  factureEditee?: boolean;
}

const CommandeSchema = new Schema<ICommande>(
  {
    numCommande: { type: String, required: true, unique: true },
    numComm: { type: String },
    dateCommande: { type: Date, required: true, default: Date.now },
    heureAjout: { type: String },
    totalHT: { type: Number, default: 0 },
    mainDoeuvre: { type: Number, default: 0 },
    remise: { type: Number, default: 0 },
    totalAvecRemise: { type: Number, default: 0 },
    totalTVA: { type: Number, default: 0 },
    totalTTC: { type: Number, default: 0 },
    totalPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientC: { type: String },
    contactC: { type: String },
    statutC: { type: String, default: "brouillon" },
    modeReglement: { type: String },
    banque: { type: String },
    numCheque: { type: String },
    saisiePar: { type: String },
    delaisExecution: { type: String },
    validiteCommande: { type: String },
    objetCommande: { type: String },
    dateExecution: { type: Date },
    numAchat: { type: String },
    cachetDG: { type: String },
    garantie: { type: String },
    tauxRemise: { type: Number, default: 0 },
    taux: { type: Number, default: 0 },
    telephone: { type: String },
    mail: { type: String },
    boitePostale: { type: String },
    serviceAchat: { type: Boolean, default: false },
    envoyeAchatPar: { type: String },
    envoyeLe: { type: Date },
    bonAchat: { type: String },
    deviseM: { type: String, default: "FCFA" },
    factureEditee: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "commandes" }
);

export const Commande: Model<ICommande> =
  (mongoose.models.Commande as Model<ICommande>) ||
  mongoose.model<ICommande>("Commande", CommandeSchema);
