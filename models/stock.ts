import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Équivalent WinDev : table Stock — une ligne par référence d'article.
 * (Reference, QteEnStock, QteStockVirtuel, AuteurModif, DateModif)
 */
export interface IStock extends Document {
  reference: string;
  designation?: string;
  qteEnStock: number;
  qteStockVirtuel?: number;
  seuilAlerte?: number;
  auteurModif?: string;
  dateModif?: Date;
}

const StockSchema = new Schema<IStock>(
  {
    reference: { type: String, required: true, unique: true },
    designation: { type: String },
    qteEnStock: { type: Number, default: 0 },
    qteStockVirtuel: { type: Number, default: 0 },
    seuilAlerte: { type: Number, default: 0 },
    auteurModif: { type: String },
    dateModif: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "stocks" }
);

export const Stock: Model<IStock> =
  (mongoose.models.Stock as Model<IStock>) ||
  mongoose.model<IStock>("Stock", StockSchema);
