import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Équivalent WinDev : table Login (IDLogin, Utilisateur, Login, MotDePasse,
 * IDProfil, comptebloque), adaptée aux conventions easy_medical.
 */
export interface IUser extends Document {
  nom?: string;
  prenom?: string;
  name?: string;
  email: string; // correspond au "Login" WinDev
  password?: string;
  type?: string; // correspond au profil WinDev (admin, commercial, achat, comptable, caisse)
  uid?: string;
  profilId?: Types.ObjectId;
  comptebloque?: boolean;
  permissions?: {
    services?: string[];
    actions?: string[];
    customized?: boolean;
  };
  failedAttempts?: number;
  remainingAttempts?: number;
  isLocked?: boolean;
  lockedUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nom: { type: String },
    prenom: { type: String },
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    type: { type: String, default: "commercial" },
    uid: { type: String, unique: true, sparse: true },
    profilId: { type: Schema.Types.ObjectId, ref: "Profil" },
    comptebloque: { type: Boolean, default: false },
    permissions: {
      services: { type: [String], default: undefined },
      actions: { type: [String], default: undefined },
      customized: { type: Boolean, default: false },
    },
    failedAttempts: { type: Number, default: 0 },
    remainingAttempts: { type: Number, default: 4 },
    isLocked: { type: Boolean, default: false },
    lockedUntil: { type: Date },
  },
  { timestamps: true, collection: "users" }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export const UserCollection = User;
