import mongoose, { Schema, Document, Model } from "mongoose";

/** Équivalent WinDev : table Profil (IDProfil, Profil). */
export interface IProfil extends Document {
  profil: string;
}

const ProfilSchema = new Schema<IProfil>(
  {
    profil: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: "profils" }
);

export const Profil: Model<IProfil> =
  (mongoose.models.Profil as Model<IProfil>) ||
  mongoose.model<IProfil>("Profil", ProfilSchema);
