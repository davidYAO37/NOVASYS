import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table DOCUMENT_DEVIS — fichiers joints stockés sur
 * les commandes/devis.
 * (IDDOCUMENT_Devis, LibeleDocument, Document, Date, Heure, AjouterPar,
 *  ExtensionF, NumCommande, NumComm)
 */
export interface IDocumentDevis extends Document {
  libeleDocument: string;
  document?: string; // contenu binaire encodé base64 ou chemin fichier
  date?: Date;
  heure?: string;
  ajouterPar?: string;
  extensionF?: string;
  commandeId?: Types.ObjectId;
  numCommande?: string;
  numComm?: string;
}

const DocumentDevisSchema = new Schema<IDocumentDevis>(
  {
    libeleDocument: { type: String, required: true },
    document: { type: String },
    date: { type: Date, default: Date.now },
    heure: { type: String },
    ajouterPar: { type: String },
    extensionF: { type: String },
    commandeId: { type: Schema.Types.ObjectId, ref: "Commande" },
    numCommande: { type: String },
    numComm: { type: String },
  },
  { timestamps: true, collection: "documentsdevis" }
);

export const DocumentDevis: Model<IDocumentDevis> =
  (mongoose.models.DocumentDevis as Model<IDocumentDevis>) ||
  mongoose.model<IDocumentDevis>("DocumentDevis", DocumentDevisSchema);
