import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table FOURNISSEUR
 * (IDFOURNISSEUR, NOMPREN, RaisonSociale, RCC, Téléphone, Portable, Mail,
 *  AdresseGéo, AdresseP, Observation, CréerLe, CréerPar, Modifiépar,
 *  ModifiéLe, CompteFournisseur, MontantPayé, ResteApaye, NCC).
 */
export interface IFournisseur extends Document {
  nomPren: string;
  raisonSociale?: string;
  rcc?: string;
  telephone?: string;
  portable?: string;
  mail?: string;
  adresseGeo?: string;
  adresseP?: string;
  observation?: string;
  compteFournisseur?: number;
  montantPaye?: number;
  resteAPaye?: number;
  ncc?: string;
  creerPar?: string;
  modifiePar?: string;
}

const FournisseurSchema = new Schema<IFournisseur>(
  {
    nomPren: { type: String, required: true },
    raisonSociale: { type: String },
    rcc: { type: String },
    telephone: { type: String },
    portable: { type: String },
    mail: { type: String },
    adresseGeo: { type: String },
    adresseP: { type: String },
    observation: { type: String },
    compteFournisseur: { type: Number, default: 0 },
    montantPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    ncc: { type: String },
    creerPar: { type: String },
    modifiePar: { type: String },
  },
  { timestamps: true, collection: "fournisseurs" }
);

export const Fournisseur: Model<IFournisseur> =
  (mongoose.models.Fournisseur as Model<IFournisseur>) ||
  mongoose.model<IFournisseur>("Fournisseur", FournisseurSchema);
