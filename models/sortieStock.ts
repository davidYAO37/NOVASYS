import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table SortieStock — sorties de marchandises.
 * (IDSORTIE, DateSortie, Reference, Quantite, Prix_unitaire, Prix_TotalS,
 *  Motif, Observations, SaisiPar, SaisiLe, ArticleS, NumCommandeS)
 */
export interface ISortieStock extends Document {
  dateSortie: Date;
  reference: string;
  quantite: number;
  prixUnitaire?: number;
  prixTotalS?: number;
  motif?: string;
  observations?: string;
  saisiPar?: string;
  articleS?: string;
  numCommandeS?: string;
}

const SortieStockSchema = new Schema<ISortieStock>(
  {
    dateSortie: { type: Date, required: true, default: Date.now },
    reference: { type: String, required: true },
    quantite: { type: Number, required: true },
    prixUnitaire: { type: Number, default: 0 },
    prixTotalS: { type: Number, default: 0 },
    motif: { type: String },
    observations: { type: String },
    saisiPar: { type: String },
    articleS: { type: String },
    numCommandeS: { type: String },
  },
  { timestamps: true, collection: "sortiesstock" }
);

export const SortieStock: Model<ISortieStock> =
  (mongoose.models.SortieStock as Model<ISortieStock>) ||
  mongoose.model<ISortieStock>("SortieStock", SortieStockSchema);
