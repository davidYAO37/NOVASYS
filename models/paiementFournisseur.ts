import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Paiement_Fournisseur — décaissements effectués
 * par la comptabilité sur les fiches d'émission.
 * (IDReglementFournisseur, DatePaiement, HeureAjout, PayéPar, RecuDe,
 *  TotalTapayer, MontantPayé, ResteApaye, ModeReglement, DeviseM, Banque,
 *  NumChéque, ObjetAchat, IDpaementFournisseur, IDFOURNISSEUR, Fournisseur,
 *  AlordreDe, Delaisdereglement)
 */
export interface IPaiementFournisseur extends Document {
  datePaiement: Date;
  heureAjout?: string;
  payePar?: string;
  recuDe?: string;
  totalAPayer?: number;
  montantPaye: number;
  resteAPaye?: number;
  modeReglement?: string;
  deviseM?: string;
  banque?: string;
  numCheque?: string;
  numVirement?: string;
  numTel?: string;
  objetAchat?: string;
  reglementFournisseurId?: Types.ObjectId;
  fournisseurId?: Types.ObjectId;
  fournisseur?: string;
  alOrdreDe?: string;
  delaisDeReglement?: string;
  annule?: boolean;
}

const PaiementFournisseurSchema = new Schema<IPaiementFournisseur>(
  {
    datePaiement: { type: Date, required: true, default: Date.now },
    heureAjout: { type: String },
    payePar: { type: String },
    recuDe: { type: String },
    totalAPayer: { type: Number },
    montantPaye: { type: Number, required: true },
    resteAPaye: { type: Number },
    modeReglement: { type: String },
    deviseM: { type: String, default: "FCFA" },
    banque: { type: String },
    numCheque: { type: String },
    numVirement: { type: String },
    numTel: { type: String },
    objetAchat: { type: String },
    reglementFournisseurId: { type: Schema.Types.ObjectId, ref: "ReglementFournisseur" },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    fournisseur: { type: String },
    alOrdreDe: { type: String },
    delaisDeReglement: { type: String },
    annule: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "paiementsfournisseurs" }
);

export const PaiementFournisseur: Model<IPaiementFournisseur> =
  (mongoose.models.PaiementFournisseur as Model<IPaiementFournisseur>) ||
  mongoose.model<IPaiementFournisseur>("PaiementFournisseur", PaiementFournisseurSchema);
