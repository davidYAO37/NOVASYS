import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Article (déployée dans BDD_NOVASYS).
 * (IDArticle, Reference, DésignationA, Quantite, PrixVente, Obsevation,
 *  PrixAchatA, Prix_TotalAchat, IDTVA, MontTVA, Couleur, Marque, Photo,
 *  Indice, AjouterPar, DateAjout, HeureAjout, ModifierParA, DateModifA,
 *  HeureModif, IDFamille, FAmille)
 */
export interface IArticle extends Document {
  reference: string;
  designationA: string;
  quantite?: number;
  prixVente: number;
  observation?: string;
  prixAchatA?: number;
  prixTotalAchat?: number;
  tvaId?: Types.ObjectId;
  montTVA?: number;
  couleur?: string;
  marque?: string;
  photo?: string;
  indice?: number;
  ajouterPar?: string;
  heureAjout?: string;
  modifierPar?: string;
  familleId?: Types.ObjectId;
  famille?: string;
  seuilAlerte?: number;
}

const ArticleSchema = new Schema<IArticle>(
  {
    reference: { type: String, required: true, unique: true },
    designationA: { type: String, required: true },
    quantite: { type: Number, default: 0 },
    prixVente: { type: Number, default: 0 },
    observation: { type: String },
    prixAchatA: { type: Number, default: 0 },
    prixTotalAchat: { type: Number, default: 0 },
    tvaId: { type: Schema.Types.ObjectId, ref: "TVA" },
    montTVA: { type: Number, default: 0 },
    couleur: { type: String },
    marque: { type: String },
    photo: { type: String },
    indice: { type: Number },
    ajouterPar: { type: String },
    heureAjout: { type: String },
    modifierPar: { type: String },
    familleId: { type: Schema.Types.ObjectId, ref: "Famille" },
    famille: { type: String },
    seuilAlerte: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "articles" }
);

export const Article: Model<IArticle> =
  (mongoose.models.Article as Model<IArticle>) ||
  mongoose.model<IArticle>("Article", ArticleSchema);
