"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, STATUTS_ACHAT } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/**
 * Bons de commande fournisseur : liste de la période, voir le bon de
 * commande, transférer pour l'émission du chèque (vers la comptabilité).
 */
export default function AchatsPage() {
  const [achats, setAchats] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [apercuId, setApercuId] = useState<string | null>(null);

  const charger = useCallback(() => {
    axios.get("/api/achats", { params: { du, au } })
      .then((r) => setAchats(r.data)).catch(() => {});
  }, [du, au]);

  useEffect(() => { charger(); }, [charger]);

  const transferer = async (id: string) => {
    if (!confirm("Transférer ce bon de commande pour l'émission du chèque ?")) return;
    try {
      await axios.post(`/api/achats/${id}/transfert-compta`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Transfert impossible");
    }
  };

  return (
    <div>
      <h3 className="mb-3 titre-page">Bons de commande fournisseur</h3>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} sm={6} md={3}><Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}><Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Col>
            <Col xs={12} sm={6} md={3}>
              <Button variant="outline-primary" onClick={charger}>
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
              <th>N° Bon</th><th>Date</th><th>Fournisseur</th><th>N° Devis lié</th>
              <th className="text-end">Total TTC</th><th>Statut</th><th>Chèque</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {achats.map((a) => (
              <tr key={a._id}>
                <td className="fw-semibold">{a.numAchat}</td>
                <td>{fmtDate(a.dateAchat)}</td>
                <td>{a.fournisseur}</td>
                <td>{a.numCommande}</td>
                <td className="text-end">{fmtMontant(a.totalTTC)}</td>
                <td><Badge bg={STATUTS_ACHAT[a.statutAchat]?.color || "secondary"}>
                  {STATUTS_ACHAT[a.statutAchat]?.label || a.statutAchat}</Badge>
                  {a.renvoyeCompta && !a.serviceComptable && (
                    <div className="mt-1">
                      <Badge bg="warning" text="dark">Renvoyé par la compta</Badge>
                      {a.motifRenvoi && <div className="small text-muted">{a.motifRenvoi}</div>}
                    </div>
                  )}
                </td>
                <td>{a.chequeEdite ? <Badge bg="success">Édité</Badge> : <Badge bg="secondary">—</Badge>}</td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Voir le bon de commande"
                    onClick={() => setApercuId(a._id)}>
                    <i className="bi bi-file-earmark-text"></i>
                  </Button>
                  {!a.serviceComptable && (
                    <Button size="sm" variant="outline-success" title="Transférer pour l'émission du chèque"
                      onClick={() => transferer(a._id)}>
                      <i className="bi bi-send"></i>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!achats.length && (
              <tr><td colSpan={8} className="text-center text-muted py-4">Aucun bon de commande sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <PdfPreviewModal type="bon-commande" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}
