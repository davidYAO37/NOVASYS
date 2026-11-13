import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table LigneCde — lignes des devis/commandes.
 * (IDLigneCde, Reference, ArtcleM, NumCommande, Quantite, PrixUnitaire,
 *  PriUnitaireHT, FraisTransport, PrixTotalHT, NUMSERIE, Tauxdedouanement,
 *  TauxMarge, ValeurConvertisseur, AutreMontant, Description, TauxBancaire,
 *  Fournisseur, BonAchatEdité, NumAchat, DeviseM)
 */
export interface ILigneCde extends Document {
  commandeId: Types.ObjectId;
  numCommande?: string;
  reference?: string;
  articleM?: string;
  quantite: number;
  prixUnitaire: number;
  prixUnitaireHT?: number;
  fraisTransport?: number;
  prixTotalHT: number;
  numSerie?: string;
  tauxDeDouanement?: number;
  tauxMarge?: number;
  valeurConvertisseur?: number;
  autreMontant?: number;
  description?: string;
  tauxBancaire?: number;
  fournisseur?: string;
  fournisseurId?: Types.ObjectId;
  bonAchatEdite?: boolean;
  numAchat?: string;
  deviseM?: string;
}

const LigneCdeSchema = new Schema<ILigneCde>(
  {
    commandeId: { type: Schema.Types.ObjectId, ref: "Commande", required: true },
    numCommande: { type: String },
    reference: { type: String },
    articleM: { type: String },
    quantite: { type: Number, default: 0 },
    prixUnitaire: { type: Number, default: 0 },
    prixUnitaireHT: { type: Number, default: 0 },
    fraisTransport: { type: Number, default: 0 },
    prixTotalHT: { type: Number, default: 0 },
    numSerie: { type: String },
    tauxDeDouanement: { type: Number, default: 0 },
    tauxMarge: { type: Number, default: 0 },
    valeurConvertisseur: { type: Number, default: 0 },
    autreMontant: { type: Number, default: 0 },
    description: { type: String },
    tauxBancaire: { type: Number, default: 0 },
    fournisseur: { type: String },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    bonAchatEdite: { type: Boolean, default: false },
    numAchat: { type: String },
    deviseM: { type: String, default: "FCFA" },
  },
  { timestamps: true, collection: "lignescde" }
);

LigneCdeSchema.index({ commandeId: 1 });

export const LigneCde: Model<ILigneCde> =
  (mongoose.models.LigneCde as Model<ILigneCde>) ||
  mongoose.model<ILigneCde>("LigneCde", LigneCdeSchema);
