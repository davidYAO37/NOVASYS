import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Caisse — journal des opérations de caisse
 * (entrées/sorties).
 * (IDCaisse, typeC, Operation, MOtif, MOntantC, dAteC, HeureC, NomPrenoms,
 *  Contact, solde, AjouterParC, MODifieParC, MODifLe, IDOpération,
 *  DetteClient, DettePaye)
 */
export interface ICaisse extends Document {
  typeC: string; // "entree" | "sortie"
  operation?: string;
  motif?: string;
  montantC: number;
  dateC: Date;
  heureC?: string;
  nomPrenoms?: string;
  contact?: string;
  solde?: number;
  ajouterParC?: string;
  modifieParC?: string;
  operationId?: Types.ObjectId;
  detteClient?: number;
  dettePaye?: number;
}

const CaisseSchema = new Schema<ICaisse>(
  {
    typeC: { type: String, required: true },
    operation: { type: String },
    motif: { type: String },
    montantC: { type: Number, required: true },
    dateC: { type: Date, required: true, default: Date.now },
    heureC: { type: String },
    nomPrenoms: { type: String },
    contact: { type: String },
    solde: { type: Number, default: 0 },
    ajouterParC: { type: String },
    modifieParC: { type: String },
    operationId: { type: Schema.Types.ObjectId, ref: "Operation" },
    detteClient: { type: Number, default: 0 },
    dettePaye: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "caisse" }
);

export const Caisse: Model<ICaisse> =
  (mongoose.models.Caisse as Model<ICaisse>) ||
  mongoose.model<ICaisse>("Caisse", CaisseSchema);
