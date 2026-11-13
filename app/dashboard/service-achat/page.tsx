"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/**
 * SERVICE ACHAT (FEN_SERVICE_ACHAT) : liste des devis reçus/traités de la
 * période ; édition du bon de commande — choisir le fournisseur, cocher
 * les articles trouvés chez lui, TVA, objet, date de livraison.
 */
export default function ServiceAchatPage() {
  const [devis, setDevis] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [commande, setCommande] = useState<any>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [fournisseurId, setFournisseurId] = useState("");
  const [tva, setTva] = useState(18);
  const [objet, setObjet] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [apercuId, setApercuId] = useState<string | null>(null);

  const charger = useCallback(() => {
    axios.get("/api/commandes", { params: { du, au, recues: "1" } })
      .then((r) => setDevis(r.data)).catch(() => {});
  }, [du, au]);

  useEffect(() => {
    charger();
    axios.get("/api/fournisseurs").then((r) => setFournisseurs(r.data)).catch(() => {});
  }, [charger]);

  const ouvrir = async (c: any) => {
    const r = await axios.get(`/api/commandes/${c._id}`);
    setCommande(r.data);
    setObjet(r.data.objetCommande || "");
    setSelection(new Set((r.data.lignes || []).map((_: any, i: number) => i)));
  };

  const fournisseur = fournisseurs.find((f) => f._id === fournisseurId);

  const lignesSel = useMemo(
    () => (commande?.lignes || []).filter((_: any, i: number) => selection.has(i)),
    [commande, selection]
  );

  const totaux = useMemo(() => {
    const totalHT = lignesSel.reduce((s: number, l: any) => s + (l.prixTotalHT || 0), 0);
    const totalTVA = (totalHT * tva) / 100;
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  }, [lignesSel, tva]);

  const editerBonCommande = async () => {
    setMessage("");
    if (!fournisseurId) {
      setMessage("Choisissez le fournisseur");
      return;
    }
    if (!lignesSel.length) {
      setMessage("Cochez au moins un article");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/achats", {
        fournisseurId,
        fournisseur: fournisseur?.nomPren,
        contactF: fournisseur?.telephone,
        commandeId: commande._id,
        numCommande: commande.numCommande,
        numComm: commande.numComm,
        numAchatProfor: commande.numCommande,
        taux: tva,
        dateLivraison: dateLivraison || undefined,
        ...totaux,
        lignes: lignesSel.map((l: any) => ({
          ligneCdeId: l._id,
          reference: l.reference,
          articleM: l.articleM,
          description: l.description,
          quantite: l.quantite,
          prixAchat: l.prixUnitaire,
          prixTHT: l.prixTotalHT,
          tvaEntree: ((l.prixTotalHT || 0) * tva) / 100,
          montantTTCE: (l.prixTotalHT || 0) * (1 + tva / 100),
          observations: objet,
        })),
      });
      setCommande(null);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur lors de l'édition");
    }
    setSaving(false);
  };

  return (
    <div>
      <h3 className="mb-3">Service achat — devis reçus</h3>
      {message && <div className="alert alert-warning">{message}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={3}><Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} /></Col>
            <Col md={3}><Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} /></Col>
            <Col md={3}>
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
              <th>N° Devis</th><th>Reçu le</th><th>Envoyé par</th><th>Client</th>
              <th className="text-end">Total TTC</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devis.map((d) => (
              <tr key={d._id}>
                <td className="fw-semibold">{d.numCommande}</td>
                <td>{fmtDate(d.envoyeLe || d.dateCommande)}</td>
                <td>{d.envoyeAchatPar}</td>
                <td>{d.clientC}</td>
                <td className="text-end">{fmtMontant(d.totalTTC)}</td>
                <td>
                  {d.statutC === "traitee"
                    ? <Badge bg="success">Traitée {d.bonAchat ? `(${d.bonAchat})` : ""}</Badge>
                    : <Badge bg="warning" text="dark">En cours</Badge>}
                </td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Proforma"
                    onClick={() => setApercuId(d._id)}>
                    <i className="bi bi-file-earmark-pdf"></i>
                  </Button>
                  {d.statutC !== "traitee" && (
                    <Button size="sm" variant="outline-success" onClick={() => ouvrir(d)}>
                      <i className="bi bi-bag-plus me-1"></i>Bon de commande
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!devis.length && (
              <tr><td colSpan={7} className="text-center text-muted py-4">Aucun devis reçu sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Édition du bon de commande */}
      <Modal show={!!commande} onHide={() => setCommande(null)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Édition du bon de commande — {commande?.numCommande}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3 mb-3">
            <Col md={4}>
              <Form.Label>Choisir le fournisseur *</Form.Label>
              <Form.Select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {fournisseurs.map((f) => (
                  <option key={f._id} value={f._id}>{f.nomPren}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>TVA (%)</Form.Label>
              <Form.Control type="number" value={tva} onChange={(e) => setTva(Number(e.target.value))} />
            </Col>
            <Col md={3}>
              <Form.Label>Date de livraison</Form.Label>
              <Form.Control type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} />
            </Col>
            <Col md={3}>
              <Form.Label>Objet</Form.Label>
              <Form.Control value={objet} onChange={(e) => setObjet(e.target.value)} />
            </Col>
          </Row>

          <div className="mb-2 fw-semibold">Cocher les articles trouvés chez le fournisseur :</div>
          <Table size="sm" hover>
            <thead>
              <tr><th style={{ width: 40 }}></th><th>Référence</th><th>Article</th>
                <th className="text-end">Qté</th><th className="text-end">P.U.</th><th className="text-end">Total HT</th></tr>
            </thead>
            <tbody>
              {(commande?.lignes || []).map((l: any, i: number) => (
                <tr key={i}>
                  <td>
                    <Form.Check checked={selection.has(i)} onChange={(e) => {
                      const s = new Set(selection);
                      e.target.checked ? s.add(i) : s.delete(i);
                      setSelection(s);
                    }} />
                  </td>
                  <td>{l.reference}</td>
                  <td>{l.articleM}</td>
                  <td className="text-end">{l.quantite}</td>
                  <td className="text-end">{fmtMontant(l.prixUnitaire)}</td>
                  <td className="text-end">{fmtMontant(l.prixTotalHT)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="text-end fs-5">
            Total TTC : <strong>{fmtMontant(totaux.totalTTC)} FCFA</strong>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCommande(null)}>Annuler</Button>
          <Button onClick={editerBonCommande} disabled={saving}>
            {saving ? "Édition..." : "Valider le bon de commande"}
          </Button>
        </Modal.Footer>
      </Modal>

      <PdfPreviewModal type="proforma" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}
