"use client";

import React from "react";
import { fmtMontant, fmtDate } from "@/lib/format";

/**
 * Mise en page d'impression commune aux documents NOVASYS
 * (équivalent des états ETAT_Proforma, ETAT_FACTURE, ETAT_Bon_de_livraison,
 *  ETAT_Bon_de_commande, ETAT_Recu) : en-tête entreprise, tableau des
 * lignes, totaux, pied de page.
 */
export interface PrintLigne {
  reference?: string;
  articleM?: string;
  description?: string;
  quantite?: number;
  prixUnitaire?: number;
  prixAchat?: number;
  prixTotalHT?: number;
  prixTHT?: number;
  montantTTCE?: number;
}

interface DocumentPrintProps {
  titre: string;
  numero: string;
  date?: string | Date;
  devise?: string;
  tiersLabel?: string;
  tiers?: {
    nom?: string;
    contact?: string;
    mail?: string;
    telephone?: string;
    adresse?: string;
    boitePostale?: string;
  };
  objet?: string;
  lignes: PrintLigne[];
  totalHT?: number;
  remise?: number;
  mainDoeuvre?: number;
  totalTVA?: number;
  totalTTC?: number;
  totalPaye?: number;
  resteAPaye?: number;
  modeReglement?: string;
  sansPrix?: boolean; // bon de livraison sans montants
  piedDePage?: string;
  /** Fiche entreprise (logo, enteteSociete, piedDePage, cachetDG) */
  entreprise?: {
    nomSociete?: string;
    adresseSociete?: string;
    telSociete?: string;
    emailSociete?: string;
    ncc?: string;
    logo?: string;
    enteteSociete?: string;
    piedDePage?: string;
    cachetDG?: string;
    logoPosition?: "gauche" | "droite" | "centre";
    enteteAlignement?: "gauche" | "centre" | "droite";
  } | null;
  /** false = impression sans entête ni pied (papier pré-imprimé) */
  avecEntete?: boolean;
}

const ALIGN_CSS = { gauche: "left", centre: "center", droite: "right" } as const;
const FLEX_DIRECTION = { gauche: "row", droite: "row-reverse", centre: "column" } as const;

/** Entête entreprise (logo + texte) — position du logo et alignement paramétrables. */
export function EnteteEntreprise({ e }: { e: NonNullable<DocumentPrintProps["entreprise"]> }) {
  const coord = [e.adresseSociete, e.telSociete && `Tél : ${e.telSociete}`, e.emailSociete, e.ncc && `NCC : ${e.ncc}`]
    .filter(Boolean)
    .join(" — ");
  const position = e.logoPosition || "gauche";
  return (
    <div
      className="d-flex align-items-center gap-3 border-bottom pb-2 mb-3"
      style={{ borderColor: "var(--novasys-secondary)", flexDirection: FLEX_DIRECTION[position] }}
    >
      {e.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.logo} alt="Logo" style={{ maxHeight: 80, maxWidth: 120, objectFit: "contain" }} />
      )}
      <div className="flex-grow-1 w-100" style={{ textAlign: ALIGN_CSS[e.enteteAlignement || "gauche"] }}>
        <h5 className="fw-bold mb-0" style={{ color: "var(--novasys-primary)" }}>{e.nomSociete}</h5>
        {e.enteteSociete ? (
          <div className="small text-muted" style={{ whiteSpace: "pre-line" }}>{e.enteteSociete}</div>
        ) : (
          coord && <small className="text-muted">{coord}</small>
        )}
      </div>
    </div>
  );
}

export default function DocumentPrint({
  titre,
  numero,
  date,
  devise = "FCFA",
  tiersLabel = "Client",
  tiers,
  objet,
  lignes,
  totalHT,
  remise,
  mainDoeuvre,
  totalTVA,
  totalTTC,
  totalPaye,
  resteAPaye,
  modeReglement,
  sansPrix,
  piedDePage,
  entreprise,
  avecEntete = true,
}: DocumentPrintProps) {
  const pied = piedDePage || entreprise?.piedDePage;
  return (
    <div className="p-4 bg-white" style={{ maxWidth: 800, margin: "0 auto" }}>
      {avecEntete && entreprise && <EnteteEntreprise e={entreprise} />}
      {!avecEntete && <div style={{ height: 110 }} />}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: "var(--novasys-primary)" }}>
            {titre}
          </h4>
          <div className="text-muted">N° {numero}</div>
        </div>
        <div className="text-end">
          <div>Date : {fmtDate(date)}</div>
          {devise && <div>Devise : {devise}</div>}
        </div>
      </div>

      {(tiers || objet) && (
        <div className="border rounded p-3 mb-3">
          <div className="row">
            <div className="col">
              <strong>{tiersLabel} :</strong> {tiers?.nom || "—"}
              {tiers?.contact && <div>Contact : {tiers.contact}</div>}
              {tiers?.telephone && <div>Tél. : {tiers.telephone}</div>}
              {tiers?.mail && <div>Email : {tiers.mail}</div>}
              {tiers?.adresse && <div>Adresse : {tiers.adresse}</div>}
              {tiers?.boitePostale && <div>BP : {tiers.boitePostale}</div>}
            </div>
            {objet && (
              <div className="col">
                <strong>Objet :</strong> {objet}
              </div>
            )}
          </div>
        </div>
      )}

      <table className="table table-bordered">
        <thead className="table-light">
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Référence</th>
            <th>Désignation</th>
            <th className="text-end" style={{ width: 80 }}>Qté</th>
            {!sansPrix && (
              <>
                <th className="text-end" style={{ width: 120 }}>P.U.</th>
                <th className="text-end" style={{ width: 140 }}>Total HT</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{l.reference || "—"}</td>
              <td>{l.articleM || l.description || "—"}</td>
              <td className="text-end">{l.quantite ?? 0}</td>
              {!sansPrix && (
                <>
                  <td className="text-end">{fmtMontant(l.prixUnitaire ?? l.prixAchat)}</td>
                  <td className="text-end">
                    {fmtMontant(l.prixTotalHT ?? l.prixTHT ?? (l.quantite || 0) * (l.prixUnitaire || l.prixAchat || 0))}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {!sansPrix && (
        <div className="row">
          <div className="col-6">
            {modeReglement && <div>Mode de règlement : {modeReglement}</div>}
          </div>
          <div className="col-6">
            <table className="table table-sm">
              <tbody>
                <tr>
                  <td>Total HT</td>
                  <td className="text-end fw-bold">{fmtMontant(totalHT)}</td>
                </tr>
                {(remise || 0) > 0 && (
                  <tr>
                    <td>Remise</td>
                    <td className="text-end">{fmtMontant(remise)}</td>
                  </tr>
                )}
                {(mainDoeuvre || 0) > 0 && (
                  <tr>
                    <td>Main d&apos;œuvre</td>
                    <td className="text-end">{fmtMontant(mainDoeuvre)}</td>
                  </tr>
                )}
                <tr>
                  <td>TVA</td>
                  <td className="text-end">{fmtMontant(totalTVA)}</td>
                </tr>
                <tr className="table-primary">
                  <td className="fw-bold">Total TTC</td>
                  <td className="text-end fw-bold">{fmtMontant(totalTTC)} {devise}</td>
                </tr>
                {(totalPaye || 0) > 0 && (
                  <tr>
                    <td>Payé</td>
                    <td className="text-end">{fmtMontant(totalPaye)}</td>
                  </tr>
                )}
                {(resteAPaye || 0) > 0 && (
                  <tr className="table-warning">
                    <td>Reste à payer</td>
                    <td className="text-end">{fmtMontant(resteAPaye)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="row mt-5">
        <div className="col-6">
          <div className="border-top pt-2" style={{ width: "70%" }}>Signature client</div>
        </div>
        <div className="col-6 text-end">
          {avecEntete && entreprise?.cachetDG && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entreprise.cachetDG} alt="Cachet" style={{ maxHeight: 70, maxWidth: 110 }} className="mb-1" />
          )}
          <div className="border-top pt-2 ms-auto" style={{ width: "70%" }}>Cachet / Direction</div>
        </div>
      </div>

      {avecEntete && pied && (
        <div className="text-center text-muted small mt-4 border-top pt-2" style={{ whiteSpace: "pre-line" }}>{pied}</div>
      )}
    </div>
  );
}
