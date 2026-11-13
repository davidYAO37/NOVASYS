"use client";

import { useEffect, useState } from "react";
import { Button, Card, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate, fmtMontant } from "@/lib/format";

/** FI_Dette_Fournisseur : fournisseurs avec reste à payer + émissions non décaissées. */
export default function DettesFournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [emissions, setEmissions] = useState<any[]>([]);

  useEffect(() => {
    axios.get("/api/fournisseurs").then((r) => {
      setFournisseurs(r.data.filter((f: any) => (f.resteAPaye || 0) > 0));
    }).catch(() => {});
    axios.get("/api/emissions").then((r) => {
      setEmissions(r.data.filter((e: any) => (e.resteAPaye || 0) > 0));
    }).catch(() => {});
  }, []);

  const total = fournisseurs.reduce((s, f) => s + (f.resteAPaye || 0), 0);

  return (
    <div>
      <h3 className="mb-3">Dettes fournisseurs</h3>

      <Card className="shadow-sm mb-3">
        <Card.Body className="fs-5">
          Total des dettes : <strong className="text-danger">{fmtMontant(total)} FCFA</strong>
          {" "}— {fournisseurs.length} fournisseur(s), {emissions.length} émission(s) non décaissée(s)
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-4">
        <Card.Header>Par fournisseur</Card.Header>
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr><th>Fournisseur</th><th>Téléphone</th><th className="text-end">Payé</th>
              <th className="text-end">Reste à payer</th></tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => (
              <tr key={f._id}>
                <td className="fw-semibold">{f.nomPren}</td>
                <td>{f.telephone || f.portable}</td>
                <td className="text-end">{fmtMontant(f.montantPaye)}</td>
                <td className="text-end text-danger fw-bold">{fmtMontant(f.resteAPaye)}</td>
              </tr>
            ))}
            {!fournisseurs.length && (
              <tr><td colSpan={4} className="text-center text-muted py-4">Aucune dette</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card className="shadow-sm">
        <Card.Header>Émissions de chèque non décaissées</Card.Header>
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr><th>N° Émission</th><th>Date</th><th>Fournisseur</th><th>Banque</th>
              <th className="text-end">Montant</th><th className="text-end">Reste</th></tr>
          </thead>
          <tbody>
            {emissions.map((e) => (
              <tr key={e._id}>
                <td>{e.numEmission}</td>
                <td>{fmtDate(e.datePaiement)}</td>
                <td>{e.fournisseur}</td>
                <td>{e.banque}</td>
                <td className="text-end">{fmtMontant(e.montantTotal)}</td>
                <td className="text-end text-danger fw-bold">{fmtMontant(e.resteAPaye)}</td>
              </tr>
            ))}
            {!emissions.length && (
              <tr><td colSpan={6} className="text-center text-muted py-4">Aucune émission en attente</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
