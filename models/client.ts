import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table CLIENT
 * (IDClient, NOMPREN, RaisonSociale, RCC, VilleClient, AdresseGéo, Téléphone,
 *  Mail, Observation, CréerLe, CréerPar, Modifiépar, ModifiéLe, statut,
 *  SOLDECLIENT, MontantPayé, ResteApaye, FOCTIONCLIEN, STRUCTURECLI, NCC,
 *  BOitePostale).
 */
export interface IClient extends Document {
  nomPren: string;
  raisonSociale?: string;
  rcc?: string;
  villeClient?: string;
  adresseGeo?: string;
  telephone?: string;
  mail?: string;
  observation?: string;
  statut?: string;
  soldeClient?: number;
  montantPaye?: number;
  resteAPaye?: number;
  fonctionClient?: string;
  structureCli?: string;
  ncc?: string;
  boitePostale?: string;
  creerPar?: string;
  modifiePar?: string;
}

const ClientSchema = new Schema<IClient>(
  {
    nomPren: { type: String, required: true },
    raisonSociale: { type: String },
    rcc: { type: String },
    villeClient: { type: String },
    adresseGeo: { type: String },
    telephone: { type: String },
    mail: { type: String },
    observation: { type: String },
    statut: { type: String, default: "Actif" },
    soldeClient: { type: Number, default: 0 },
    montantPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    fonctionClient: { type: String },
    structureCli: { type: String },
    ncc: { type: String },
    boitePostale: { type: String },
    creerPar: { type: String },
    modifiePar: { type: String },
  },
  { timestamps: true, collection: "clients" }
);

export const Client: Model<IClient> =
  (mongoose.models.Client as Model<IClient>) ||
  mongoose.model<IClient>("Client", ClientSchema);
