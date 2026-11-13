import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : tables Licence + DATECONTROLE — activation du
 * logiciel (FEN_Activation, COL_Info_delai_Activation).
 */
export interface ILicence extends Document {
  licence?: string;
  essai?: boolean;
  activationL?: Date;
  definitif?: boolean;
  enregistreL?: boolean;
}

const LicenceSchema = new Schema<ILicence>(
  {
    licence: { type: String },
    essai: { type: Boolean, default: true },
    activationL: { type: Date },
    definitif: { type: Boolean, default: false },
    enregistreL: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "licence" }
);

export const Licence: Model<ILicence> =
  (mongoose.models.Licence as Model<ILicence>) ||
  mongoose.model<ILicence>("Licence", LicenceSchema);

/** Équivalent WinDev : table DATECONTROLE (IDDATECONTROLE, ContDAte, essaiC). */
export interface IDateControle extends Document {
  contDate?: Date;
  essaiC?: boolean;
}

const DateControleSchema = new Schema<IDateControle>(
  {
    contDate: { type: Date, default: Date.now },
    essaiC: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "datecontrole" }
);

export const DateControle: Model<IDateControle> =
  (mongoose.models.DateControle as Model<IDateControle>) ||
  mongoose.model<IDateControle>("DateControle", DateControleSchema);
