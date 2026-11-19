import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Transitaire associé à un bon de commande fournisseur (frais de
 * dédouanement / transit, facturés au fournisseur ou supportés par NOVASYS).
 */
export interface ITransitaire extends Document {
  nom: string;
  telephone?: string;
  mail?: string;
  adresse?: string;
  observation?: string;
  creerPar?: string;
}

const TransitaireSchema = new Schema<ITransitaire>(
  {
    nom: { type: String, required: true },
    telephone: { type: String },
    mail: { type: String },
    adresse: { type: String },
    observation: { type: String },
    creerPar: { type: String },
  },
  { timestamps: true, collection: "transitaires" }
);

export const Transitaire: Model<ITransitaire> =
  (mongoose.models.Transitaire as Model<ITransitaire>) ||
  mongoose.model<ITransitaire>("Transitaire", TransitaireSchema);
