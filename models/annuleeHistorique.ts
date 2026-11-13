import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table AnnuléeHistorique — historique des sorties /
 * lignes annulées.
 * (IDAnnule, DateSortie, Reference, Quantite, Prix_unitaire, Prix_TotalS,
 *  Motif, Observations, SaisiPar, SaisiLe, ArticleS, NumCommandeS,
 *  NumCommande)
 */
export interface IAnnuleeHistorique extends Document {
  dateSortie: Date;
  reference?: string;
  quantite?: number;
  prixUnitaire?: number;
  prixTotalS?: number;
  motif?: string;
  observations?: string;
  saisiPar?: string;
  articleS?: string;
  numCommandeS?: string;
  numCommande?: string;
}

const AnnuleeHistoriqueSchema = new Schema<IAnnuleeHistorique>(
  {
    dateSortie: { type: Date, required: true, default: Date.now },
    reference: { type: String },
    quantite: { type: Number },
    prixUnitaire: { type: Number },
    prixTotalS: { type: Number },
    motif: { type: String },
    observations: { type: String },
    saisiPar: { type: String },
    articleS: { type: String },
    numCommandeS: { type: String },
    numCommande: { type: String },
  },
  { timestamps: true, collection: "annuleeshistoriques" }
);

export const AnnuleeHistorique: Model<IAnnuleeHistorique> =
  (mongoose.models.AnnuleeHistorique as Model<IAnnuleeHistorique>) ||
  mongoose.model<IAnnuleeHistorique>("AnnuleeHistorique", AnnuleeHistoriqueSchema);
