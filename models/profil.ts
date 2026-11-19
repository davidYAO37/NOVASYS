import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table Profil (IDProfil, Profil).
 * Un profil porte un rôle de base (`type`) et, en option, un jeu de
 * permissions personnalisées appliquées aux utilisateurs qui le reçoivent.
 */
export interface IProfil extends Document {
  profil: string;
  type?: string;
  services?: string[];
  actions?: string[];
  customized?: boolean;
}

const ProfilSchema = new Schema<IProfil>(
  {
    profil: { type: String, required: true, unique: true },
    type: { type: String, default: "commercial" },
    services: [String],
    actions: [String],
    customized: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "profils" }
);

export const Profil: Model<IProfil> =
  (mongoose.models.Profil as Model<IProfil>) ||
  mongoose.model<IProfil>("Profil", ProfilSchema);
