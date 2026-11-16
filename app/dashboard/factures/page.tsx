"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, STATUTS_FACTURE } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/**
 * EDITION DES FACTURES ET BONS DE LIVRAISON : liste des factures de la
 * période, afficher facture/BL, nouvelle facture, marquage édition.
 */
function Factures() {
  const router = useRouter();
  const params = useSearchParams();
  const [factures, setFactures] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [nonSoldees, setNonSoldees] = useState(params.get("nonSoldees") === "1");
  const [apercu, setApercu] = useState<{ type: "facture" | "bl"; id: string } | null>(null);

  const charger = useCallback(() => {
    axios.get("/api/factures", {
      params: { du, au, nonSoldees: nonSoldees ? "1" : undefined },
    }).then((r) => setFactures(r.data)).catch(() => {});
  }, [du, au, nonSoldees]);

  useEffect(() => { charger(); }, [charger]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Factures et bons de livraison</h3>
        <Button onClick={() => router.push("/dashboard/factures/nouvelle")}>
          <i className="bi bi-plus-lg me-1"></i>Saisir nouvelle facture
        </Button>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} sm={6} md={3}><Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}><Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Check type="checkbox" label="Non soldées uniquement"
                checked={nonSoldees} onChange={(e) => setNonSoldees(e.target.checked)} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Button variant="outline-primary" onClick={charger} className="w-100">
                <i className="bi bi-arrow-clockwise me-1"></i>Actualiser
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>N° Facture</th><th>N° BL</th><th>Date</th><th>Client</th>
              <th>Commande</th><th className="text-end">Total TTC</th>
              <th className="text-end">Payé</th><th className="text-end">Reste</th>
              <th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f._id}>
                <td className="fw-semibold">{f.numFacture}</td>
                <td>{f.numBonFacture}</td>
                <td>{fmtDate(f.dateFacture)}</td>
                <td>{f.clientC}</td>
                <td>{f.numCommande}</td>
                <td className="text-end">{fmtMontant(f.totalTTC)}</td>
                <td className="text-end">{fmtMontant(f.totalPaye)}</td>
                <td className="text-end">{fmtMontant(f.resteAPaye)}</td>
                <td><Badge bg={STATUTS_FACTURE[f.statutC]?.color || "secondary"}>
                  {STATUTS_FACTURE[f.statutC]?.label || f.statutC}</Badge></td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Voir la facture"
                    onClick={() => setApercu({ type: "facture", id: f._id })}>
                    <i className="bi bi-receipt"></i>
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-1" title="Voir le bon de livraison"
                    onClick={() => setApercu({ type: "bl", id: f._id })}>
                    <i className="bi bi-truck"></i>
                  </Button>
                  <Button size="sm" variant="outline-info" title="Actualiser la facture"
                    onClick={() => router.push(`/dashboard/factures/${f._id}`)}>
                    <i className="bi bi-pencil-square"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!factures.length && (
              <tr><td colSpan={10} className="text-center text-muted py-4">Aucune facture sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <PdfPreviewModal
        type={apercu?.type || "facture"}
        id={apercu?.id || null}
        show={!!apercu}
        onHide={() => setApercu(null)}
      />
    </div>
  );
}

export default function FacturesPage() {
  return (
    <Suspense fallback={<div className="text-center p-5">Chargement...</div>}>
      <Factures />
    </Suspense>
  );
}
