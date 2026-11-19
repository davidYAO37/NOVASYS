import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/users.model";
import { db } from "@/db/mongoConnect";
import {
  getUserPermissions,
  hasActionPermission,
  matchesAllowedRoles,
  type ResolvedPermissions,
} from "@/lib/permissions";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("❌ JWT_SECRET (ou NEXTAUTH_SECRET) doit être défini dans les variables d'environnement");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const TOKEN_NAME = "novasys_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

// En production derrière HTTP simple (ex. install locale sur le LAN via
// http://192.168.x.x:3000), un cookie Secure est refusé par le navigateur et
// la session ne persiste jamais. COOKIE_SECURE=false permet de le désactiver
// explicitement ; par défaut on garde secure=true en production.
function isSecureCookie(): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override !== undefined && override !== "") {
    return override === "true";
  }
  return process.env.NODE_ENV === "production";
}

export interface JWTPayload {
  userId: string;
  email: string;
  type: string;
  /** Incrémenté au changement de mot de passe : révoque les anciens jetons. */
  tv?: number;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value;
}

export interface CurrentUser {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  type: string;
  uid: string;
  permissions: ResolvedPermissions;
}

export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser | null> {
  const token = req?.cookies?.get(TOKEN_NAME)?.value || (await getTokenFromCookies());
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  await db();
  const user = await User.findById(payload.userId).lean();

  if (!user) return null;
  if (user.comptebloque) return null;
  // Jeton émis avant un changement de mot de passe → invalide
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) return null;

  return {
    _id: user._id.toString(),
    nom: user.nom || user.name || "",
    prenom: user.prenom || "",
    email: user.email,
    type: user.type || "commercial",
    uid: user.uid || "",
    permissions: getUserPermissions(user),
  };
}

export interface RequireAuthOptions {
  /**
   * Actions requises : l'utilisateur doit posséder TOUTES ces actions.
   * Peut servir d'alternative au rôle : un utilisateur dont le type n'est
   * pas dans allowedRoles mais qui possède les actions requises passe.
   */
  actions?: string[];
  /**
   * Par défaut, une licence bloquée (essai expiré, licence suspendue ou
   * résiliée) coupe l'accès à toutes les API — comportement équivalent au
   * blocage DATECONTROLE WinDev. Les routes licence/activation passent
   * `licenceExempt: true` pour rester accessibles même bloquées.
   */
  licenceExempt?: boolean;
}

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[],
  options?: RequireAuthOptions
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return { error: NextResponse.json({ message: "Non authentifié" }, { status: 401 }), user: null };
  }

  if (!options?.licenceExempt) {
    const { Entreprise } = await import("@/models/entreprise");
    const { getLicenceStatus } = await import("@/lib/licence");
    const entreprise = await Entreprise.findOne().lean();
    const licence = getLicenceStatus(entreprise as any);
    if (licence.isBlocked) {
      return {
        error: NextResponse.json(
          {
            message: licence.alerts[0]?.message || "Licence inactive",
            code: "LICENCE_BLOQUEE",
            effectiveStatus: licence.effectiveStatus,
          },
          { status: 402 }
        ),
        user: null,
      };
    }
  }

  const roleAllowed =
    !allowedRoles ||
    allowedRoles.includes(user.type) ||
    user.type === "admin" ||
    user.type === "adminsuper" ||
    // Repli : services personnalisés couvrant les services des rôles demandés
    matchesAllowedRoles(user, allowedRoles);

  const hasRequiredActions =
    !!options?.actions?.length &&
    options.actions.every((action) => hasActionPermission(user, action));
  const actionsOk = !options?.actions?.length || hasRequiredActions;

  // Accès si : rôle OK + actions requises OK, ou bien rôle KO mais toutes les
  // actions requises sont accordées (accès alternatif par permission).
  if (!actionsOk || (!roleAllowed && !hasRequiredActions)) {
    return { error: NextResponse.json({ message: "Accès interdit" }, { status: 403 }), user: null };
  }

  return { user, error: null };
}

export async function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function removeAuthCookie(response: NextResponse) {
  response.cookies.set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
