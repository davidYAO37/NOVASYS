import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table Entreprise
 * (IDSociété, NomSociété, AdresseSociété, TelSociété, VilleSociété,
 *  EmailSociété, LogoE, FaxSociete, PAys, Activité, NCC, SituationGéo,
 *  PIEDDEPAGE, CachetDG).
 *
 * Les champs licence reprennent le modèle easy_medical : la licence est
 * portée par la fiche entreprise (une seule en mono-base).
 */
export interface IEntreprise extends Document {
  nomSociete: string;
  adresseSociete?: string;
  telSociete?: string;
  villeSociete?: string;
  emailSociete?: string;
  logo?: string;
  faxSociete?: string;
  pays?: string;
  activite?: string;
  ncc?: string;
  situationGeo?: string;
  enteteSociete?: string;
  piedDePage?: string;
  cachetDG?: string;
  /** Mise en page de l'entête des impressions */
  logoPosition?: "gauche" | "droite" | "centre";
  enteteAlignement?: "gauche" | "centre" | "droite";

  // Licence (modèle easy_medical adapté)
  licenceType?: "trial" | "paid";
  licenceStatus?: "active" | "suspended" | "resiliated";
  licenceStartDate?: Date;
  licenceEndDate?: Date;
  licenceActivatedAt?: Date;
  licenceKey?: string;
  maintenanceAccepted?: boolean;
  maintenanceDueDate?: Date;
  gracePeriodDays?: number;
  modules?: string[];
}

const EntrepriseSchema = new Schema<IEntreprise>(
  {
    nomSociete: { type: String, required: true },
    adresseSociete: { type: String },
    telSociete: { type: String },
    villeSociete: { type: String },
    emailSociete: { type: String },
    logo: { type: String },
    faxSociete: { type: String },
    pays: { type: String },
    activite: { type: String },
    ncc: { type: String },
    situationGeo: { type: String },
    // Entête libre affiché sur les impressions (équiv. EnteteSociete easy_medical)
    enteteSociete: { type: String, maxlength: 10000 },
    piedDePage: { type: String },
    cachetDG: { type: String },
    logoPosition: { type: String, enum: ["gauche", "droite", "centre"], default: "gauche" },
    enteteAlignement: { type: String, enum: ["gauche", "centre", "droite"], default: "gauche" },

    licenceType: { type: String, enum: ["trial", "paid"] },
    licenceStatus: { type: String, enum: ["active", "suspended", "resiliated"] },
    licenceStartDate: { type: Date },
    licenceEndDate: { type: Date },
    licenceActivatedAt: { type: Date },
    licenceKey: { type: String },
    maintenanceAccepted: { type: Boolean },
    maintenanceDueDate: { type: Date },
    gracePeriodDays: { type: Number, default: 15 },
    modules: { type: [String], default: undefined },
  },
  { timestamps: true, collection: "entreprise" }
);

export const Entreprise: Model<IEntreprise> =
  (mongoose.models.Entreprise as Model<IEntreprise>) ||
  mongoose.model<IEntreprise>("Entreprise", EntrepriseSchema);
