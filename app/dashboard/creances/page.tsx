"use client";

import { useEffect, useState } from "react";
import { Button, Card, Table } from "react-bootstrap";
import axios from "axios";
import { fmtMontant } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/** FI_creance_client : clients avec reste à payer > 0. */
export default function CreancesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [apercuId, setApercuId] = useState<string | null>(null);

  useEffect(() => {
    axios.get("/api/clients").then((r) => {
      setClients(r.data.filter((c: any) => (c.resteAPaye || 0) > 0));
    }).catch(() => {});
    axios.get("/api/factures", { params: { nonSoldees: "1" } })
      .then((r) => setFactures(r.data)).catch(() => {});
  }, []);

  const total = clients.reduce((s, c) => s + (c.resteAPaye || 0), 0);

  return (
    <div>
      <h3 className="mb-3 titre-page">Créances clients</h3>

      <Card className="shadow-sm mb-3">
        <Card.Body className="fs-5">
          Total des créances : <strong className="text-warning">{fmtMontant(total)} FCFA</strong>
          {" "}— {clients.length} client(s), {factures.length} facture(s) non soldée(s)
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-4">
        <Card.Header>Par client</Card.Header>
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr><th>Client</th><th>Téléphone</th><th className="text-end">Payé</th>
              <th className="text-end">Reste à payer</th></tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c._id}>
                <td className="fw-semibold">{c.nomPren}</td>
                <td>{c.telephone}</td>
                <td className="text-end">{fmtMontant(c.montantPaye)}</td>
                <td className="text-end text-warning fw-bold">{fmtMontant(c.resteAPaye)}</td>
              </tr>
            ))}
            {!clients.length && (
              <tr><td colSpan={4} className="text-center text-muted py-4">Aucune créance</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card className="shadow-sm">
        <Card.Header>Factures non soldées</Card.Header>
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr><th>N° Facture</th><th>Client</th><th className="text-end">Total TTC</th>
              <th className="text-end">Payé</th><th className="text-end">Reste</th><th></th></tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f._id}>
                <td>{f.numFacture}</td>
                <td>{f.clientC}</td>
                <td className="text-end">{fmtMontant(f.totalTTC)}</td>
                <td className="text-end">{fmtMontant(f.totalPaye)}</td>
                <td className="text-end text-warning fw-bold">{fmtMontant(f.resteAPaye)}</td>
                <td>
                  <Button size="sm" variant="outline-primary" title="Voir la facture"
                    onClick={() => setApercuId(f._id)}>
                    <i className="bi bi-receipt"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!factures.length && (
              <tr><td colSpan={6} className="text-center text-muted py-4">Aucune facture non soldée</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <PdfPreviewModal type="facture" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}
