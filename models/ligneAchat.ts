import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Ligne_Achat — lignes des bons de commande
 * fournisseur.
 * (idLigneAchat, DateAppro, ArtcleM, Quantite, PrixAchat, PRIXTHT,
 *  TVAEntree, MontantTTCE, SaisiPar, SaisiLe, Observations, IDFOURNISSEUR,
 *  Reference, NumAchat, Fournisseur, NSERIE, Description, Taux, IDLigneCde,
 *  NumCommande, DeviseM)
 */
export interface ILigneAchat extends Document {
  achatId: Types.ObjectId;
  numAchat?: string;
  dateAppro?: Date;
  articleM?: string;
  quantite: number;
  prixAchat: number;
  prixTHT?: number;
  tvaEntree?: number;
  montantTTCE?: number;
  saisiPar?: string;
  observations?: string;
  fournisseurId?: Types.ObjectId;
  fournisseur?: string;
  reference?: string;
  nSerie?: string;
  description?: string;
  taux?: number;
  ligneCdeId?: Types.ObjectId;
  numCommande?: string;
  deviseM?: string;
}

const LigneAchatSchema = new Schema<ILigneAchat>(
  {
    achatId: { type: Schema.Types.ObjectId, ref: "Achat", required: true },
    numAchat: { type: String },
    dateAppro: { type: Date },
    articleM: { type: String },
    quantite: { type: Number, default: 0 },
    prixAchat: { type: Number, default: 0 },
    prixTHT: { type: Number, default: 0 },
    tvaEntree: { type: Number, default: 0 },
    montantTTCE: { type: Number, default: 0 },
    saisiPar: { type: String },
    observations: { type: String },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    fournisseur: { type: String },
    reference: { type: String },
    nSerie: { type: String },
    description: { type: String },
    taux: { type: Number, default: 0 },
    ligneCdeId: { type: Schema.Types.ObjectId, ref: "LigneCde" },
    numCommande: { type: String },
    deviseM: { type: String, default: "FCFA" },
  },
  { timestamps: true, collection: "lignesachat" }
);

LigneAchatSchema.index({ achatId: 1 });

export const LigneAchat: Model<ILigneAchat> =
  (mongoose.models.LigneAchat as Model<ILigneAchat>) ||
  mongoose.model<ILigneAchat>("LigneAchat", LigneAchatSchema);
