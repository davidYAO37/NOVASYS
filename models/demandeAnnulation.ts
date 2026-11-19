import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Demande d'annulation d'un paiement : décaissement fournisseur ou
 * encaissement client (facture). Celui qui a encaissé/décaissé demande
 * à l'admin, qui approuve (annulation effective) ou rejette.
 * statut : en_attente / approuvee / rejetee.
 */
export interface IDemandeAnnulation extends Document {
  type: string; // decaissement | encaissement
  paiementFournisseurId?: Types.ObjectId;
  reglementFournisseurId?: Types.ObjectId;
  numEmission?: string;
  fournisseur?: string;
  paiementClientId?: Types.ObjectId;
  factureId?: Types.ObjectId;
  numFacture?: string;
  clientC?: string;
  montant?: number;
  motif: string;
  demandePar: string;
  demandeurId?: Types.ObjectId;
  demandeLe: Date;
  statut: string;
  traitePar?: string;
  traiteLe?: Date;
  motifRefus?: string;
}

const DemandeAnnulationSchema = new Schema<IDemandeAnnulation>(
  {
    type: { type: String, default: "decaissement" },
    paiementFournisseurId: { type: Schema.Types.ObjectId, ref: "PaiementFournisseur" },
    reglementFournisseurId: { type: Schema.Types.ObjectId, ref: "ReglementFournisseur" },
    numEmission: { type: String },
    fournisseur: { type: String },
    paiementClientId: { type: Schema.Types.ObjectId, ref: "PaiementClient" },
    factureId: { type: Schema.Types.ObjectId, ref: "FactureClient" },
    numFacture: { type: String },
    clientC: { type: String },
    montant: { type: Number },
    motif: { type: String, required: true },
    demandePar: { type: String, required: true },
    demandeurId: { type: Schema.Types.ObjectId, ref: "User" },
    demandeLe: { type: Date, default: Date.now },
    statut: { type: String, default: "en_attente" },
    traitePar: { type: String },
    traiteLe: { type: Date },
    motifRefus: { type: String },
  },
  { timestamps: true, collection: "demandesannulation" }
);

export const DemandeAnnulation: Model<IDemandeAnnulation> =
  (mongoose.models.DemandeAnnulation as Model<IDemandeAnnulation>) ||
  mongoose.model<IDemandeAnnulation>("DemandeAnnulation", DemandeAnnulationSchema);
