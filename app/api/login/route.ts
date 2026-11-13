import { NextResponse, NextRequest } from "next/server";
import { verifyPassword } from "@/utils/auth";
import { signToken, setAuthCookie } from "@/lib/auth";
import { db } from "@/db/mongoConnect";
import { User } from "@/models/users.model";
import { JournalConnexion } from "@/models/journalConnexion";
import { getUserPermissions } from "@/lib/permissions";

const MAX_ATTEMPTS = 4;
const LOCK_DURATION_MINUTES = 30;

export async function POST(req: NextRequest) {
  try {
    await db();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Identifiant et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const logConnexion = async (
      statut: "success" | "failure" | "locked",
      message?: string
    ) => {
      await JournalConnexion.create({
        userId: user ? user._id : undefined,
        email: email.toLowerCase().trim(),
        ip: clientIp,
        userAgent,
        statut,
        message,
      });
    };

    if (!user) {
      await logConnexion("failure", "Utilisateur introuvable");
      return NextResponse.json(
        { message: "Identifiant ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Compte bloqué par l'administrateur (champ comptebloque WinDev)
    if (user.comptebloque) {
      await logConnexion("locked", "Compte bloqué par l'administrateur");
      return NextResponse.json(
        { message: "Compte bloqué. Contactez l'administrateur." },
        { status: 423 }
      );
    }

    // Vérifier si le compte est verrouillé temporairement
    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      await logConnexion("locked", "Compte temporairement verrouillé");
      return NextResponse.json(
        { message: "Compte bloqué. Contactez l'administrateur." },
        { status: 423 }
      );
    }

    // Déverrouillage automatique si la durée est passée
    if (user.isLocked && user.lockedUntil && user.lockedUntil <= new Date()) {
      user.isLocked = false;
      user.failedAttempts = 0;
      user.remainingAttempts = MAX_ATTEMPTS;
    }

    const valid = await verifyPassword(password, user.password || "");

    if (!valid) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      user.remainingAttempts = Math.max(0, MAX_ATTEMPTS - user.failedAttempts);

      if (user.failedAttempts >= MAX_ATTEMPTS) {
        user.isLocked = true;
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await user.save();
        await logConnexion("locked", "Trop de tentatives échouées");
        return NextResponse.json(
          { message: "Compte bloqué. Contactez l'administrateur." },
          { status: 423 }
        );
      }

      await user.save();
      await logConnexion("failure", "Mot de passe incorrect");
      return NextResponse.json(
        {
          message: "Identifiant ou mot de passe incorrect",
          remainingAttempts: user.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Connexion réussie : réinitialiser les compteurs
    user.failedAttempts = 0;
    user.remainingAttempts = MAX_ATTEMPTS;
    user.isLocked = false;
    user.lockedUntil = undefined;
    await user.save();

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      type: user.type || "commercial",
    });

    const response = NextResponse.json({
      message: "Connexion réussie",
      user: {
        _id: user._id.toString(),
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        type: user.type,
        permissions: getUserPermissions(user),
      },
    });

    await setAuthCookie(response, token);
    await logConnexion("success");
    return response;
  } catch (error: any) {
    console.error("Erreur login:", error);
    return NextResponse.json(
      { message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
