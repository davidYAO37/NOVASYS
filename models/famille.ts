import mongoose, { Schema, Document, Model } from "mongoose";

/** Équivalent WinDev : table Famille (IDFamille, Libelle). */
export interface IFamille extends Document {
  libelle: string;
}

const FamilleSchema = new Schema<IFamille>(
  {
    libelle: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: "familles" }
);

export const Famille: Model<IFamille> =
  (mongoose.models.Famille as Model<IFamille>) ||
  mongoose.model<IFamille>("Famille", FamilleSchema);
