import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table EntréeStock — approvisionnements.
 * (DateAppro, Quantite, PrixAchat, PRIXTHT, TVAEntree, MontantTTCE,
 *  SaisiPar, SaisiLe, Observations, IDFOURNISSEUR, Reference, NumAchat,
 *  Fournisseur)
 */
export interface IEntreeStock extends Document {
  dateAppro: Date;
  quantite: number;
  prixAchat: number;
  prixTHT?: number;
  tvaEntree?: number;
  montantTTCE?: number;
  saisiPar?: string;
  observations?: string;
  fournisseurId?: Types.ObjectId;
  fournisseur?: string;
  reference: string;
  numAchat?: string;
}

const EntreeStockSchema = new Schema<IEntreeStock>(
  {
    dateAppro: { type: Date, required: true, default: Date.now },
    quantite: { type: Number, required: true },
    prixAchat: { type: Number, default: 0 },
    prixTHT: { type: Number, default: 0 },
    tvaEntree: { type: Number, default: 0 },
    montantTTCE: { type: Number, default: 0 },
    saisiPar: { type: String },
    observations: { type: String },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    fournisseur: { type: String },
    reference: { type: String, required: true },
    numAchat: { type: String },
  },
  { timestamps: true, collection: "entreesstock" }
);

export const EntreeStock: Model<IEntreeStock> =
  (mongoose.models.EntreeStock as Model<IEntreeStock>) ||
  mongoose.model<IEntreeStock>("EntreeStock", EntreeStockSchema);
