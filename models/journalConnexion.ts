import mongoose, { Schema, Document, Model, Types } from "mongoose";

/** Journal des connexions (même convention qu'easy_medical). */
export interface IJournalConnexion extends Document {
  userId?: Types.ObjectId;
  email?: string;
  ip?: string;
  userAgent?: string;
  statut: "success" | "failure" | "locked";
  message?: string;
}

const JournalConnexionSchema = new Schema<IJournalConnexion>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    statut: { type: String, required: true },
    message: { type: String },
  },
  { timestamps: true, collection: "journalconnexions" }
);

export const JournalConnexion: Model<IJournalConnexion> =
  (mongoose.models.JournalConnexion as Model<IJournalConnexion>) ||
  mongoose.model<IJournalConnexion>("JournalConnexion", JournalConnexionSchema);
