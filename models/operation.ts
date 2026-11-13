import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table Opération — types d'opérations de caisse.
 * (IDOpération, Libeleo, TYPEOP)
 */
export interface IOperation extends Document {
  libeleo: string;
  typeOp?: string; // "entree" | "sortie"
}

const OperationSchema = new Schema<IOperation>(
  {
    libeleo: { type: String, required: true },
    typeOp: { type: String },
  },
  { timestamps: true, collection: "operations" }
);

export const Operation: Model<IOperation> =
  (mongoose.models.Operation as Model<IOperation>) ||
  mongoose.model<IOperation>("Operation", OperationSchema);
