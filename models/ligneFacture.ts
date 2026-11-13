import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table LigneFacture — lignes des factures, reprises
 * des lignes de la proforma.
 * (IDLigneFacture, ArtcleM, Description, Quantite, PrixUnitaire,
 *  PriUnitaireHT, FraisTransport, PrixTotalHT, NUMSERIE, Tauxdedouanement,
 *  TauxMarge, ValeurConvertisseur, TauxBancaire, AutreMontant, IDFacture,
 *  Reference, NSERIE)
 */
export interface ILigneFacture extends Document {
  factureId: Types.ObjectId;
  articleM?: string;
  description?: string;
  quantite: number;
  prixUnitaire: number;
  prixUnitaireHT?: number;
  fraisTransport?: number;
  prixTotalHT: number;
  numSerie?: string;
  tauxDeDouanement?: number;
  tauxMarge?: number;
  valeurConvertisseur?: number;
  tauxBancaire?: number;
  autreMontant?: number;
  reference?: string;
  nSerie?: string;
}

const LigneFactureSchema = new Schema<ILigneFacture>(
  {
    factureId: { type: Schema.Types.ObjectId, ref: "FactureClient", required: true },
    articleM: { type: String },
    description: { type: String },
    quantite: { type: Number, default: 0 },
    prixUnitaire: { type: Number, default: 0 },
    prixUnitaireHT: { type: Number, default: 0 },
    fraisTransport: { type: Number, default: 0 },
    prixTotalHT: { type: Number, default: 0 },
    numSerie: { type: String },
    tauxDeDouanement: { type: Number, default: 0 },
    tauxMarge: { type: Number, default: 0 },
    valeurConvertisseur: { type: Number, default: 0 },
    tauxBancaire: { type: Number, default: 0 },
    autreMontant: { type: Number, default: 0 },
    reference: { type: String },
    nSerie: { type: String },
  },
  { timestamps: true, collection: "lignesfacture" }
);

LigneFactureSchema.index({ factureId: 1 });

export const LigneFacture: Model<ILigneFacture> =
  (mongoose.models.LigneFacture as Model<ILigneFacture>) ||
  mongoose.model<ILigneFacture>("LigneFacture", LigneFactureSchema);
