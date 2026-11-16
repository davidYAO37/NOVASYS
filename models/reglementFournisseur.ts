import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table FOURNISSEUR_Achat_Paiement — fiches
 * d'émission de chèque / décaissement fournisseur éditées par le service
 * achat puis transférées à la comptabilité.
 * (IDpaementFournisseur, DatePaiement, HeurePaiement, PayéPar, RecuPar,
 *  MontantTotal, IDFOURNISSEUR, ModeReglement, Banque, NumChéque,
 *  Fournisseur, Delaisdereglement, AlordreDe, TotalPayé, ResteApaye,
 *  DeviseM, Remise, RemiseFaitPar, Dateremise, HeureRemise)
 */
export interface IReglementFournisseur extends Document {
  numEmission?: string;
  datePaiement: Date;
  heurePaiement?: string;
  payePar?: string;
  recuPar?: string;
  montantTotal: number;
  fournisseurId?: Types.ObjectId;
  modeReglement?: string;
  banque?: string;
  numCheque?: string;
  fournisseur?: string;
  delaisDeReglement?: string;
  alOrdreDe?: string;
  totalPaye?: number;
  resteAPaye?: number;
  deviseM?: string;
  remise?: number;
  remiseFaitPar?: string;
  dateRemise?: Date;
  heureRemise?: string;
  achatIds?: Types.ObjectId[];
  statut?: string; // emis | transfere_compta | decaisse | renvoyee | annule
  motifRenvoi?: string;
  renvoyeLe?: Date;
  renvoyePar?: string;
}

const ReglementFournisseurSchema = new Schema<IReglementFournisseur>(
  {
    numEmission: { type: String, unique: true, sparse: true },
    datePaiement: { type: Date, required: true, default: Date.now },
    heurePaiement: { type: String },
    payePar: { type: String },
    recuPar: { type: String },
    montantTotal: { type: Number, required: true },
    fournisseurId: { type: Schema.Types.ObjectId, ref: "Fournisseur" },
    modeReglement: { type: String },
    banque: { type: String },
    numCheque: { type: String },
    fournisseur: { type: String },
    delaisDeReglement: { type: String },
    alOrdreDe: { type: String },
    totalPaye: { type: Number, default: 0 },
    resteAPaye: { type: Number, default: 0 },
    deviseM: { type: String, default: "FCFA" },
    remise: { type: Number, default: 0 },
    remiseFaitPar: { type: String },
    dateRemise: { type: Date },
    heureRemise: { type: String },
    achatIds: [{ type: Schema.Types.ObjectId, ref: "Achat" }],
    statut: { type: String, default: "emis" },
    motifRenvoi: { type: String },
    renvoyeLe: { type: Date },
    renvoyePar: { type: String },
  },
  { timestamps: true, collection: "reglementsfournisseurs" }
);

export const ReglementFournisseur: Model<IReglementFournisseur> =
  (mongoose.models.ReglementFournisseur as Model<IReglementFournisseur>) ||
  mongoose.model<IReglementFournisseur>("ReglementFournisseur", ReglementFournisseurSchema);
