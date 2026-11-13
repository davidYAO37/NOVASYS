"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { fmtDate, fmtMontant, STATUTS_COMMANDE } from "@/lib/format";
import PdfButtons from "@/components/print/PdfButtons";

/**
 * Détail / actualisation d'une commande : en-tête + lignes modifiables,
 * transfert au service achat, lien proforma.
 */
export default function DetailDevisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [commande, setCommande] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const charger = () => {
    axios.get(`/api/commandes/${id}`).then((r) => {
      setCommande(r.data);
      setLignes(r.data.lignes || []);
    }).catch(() => setMessage("Commande introuvable"));
  };

  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [id]);

  if (!commande) {
    return <div className="p-4">{message || "Chargement..."}</div>;
  }

  const modifiable = commande.statutC !== "traitee";

  const majLigne = (i: number, champ: string, valeur: any) => {
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = { ...copie[i], [champ]: valeur };
      const l = copie[i];
      l.prixTotalHT =
        (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) +
        (Number(l.fraisTransport) || 0) +
        (Number(l.autreMontant) || 0);
      return copie;
    });
  };

  const recalculer = (ls: any[]) => {
    const totalHT = ls.reduce((s, l) => s + (l.prixTotalHT || 0), 0);
    const remise = (totalHT * (commande.tauxRemise || 0)) / 100;
    const totalAvecRemise = totalHT - remise + (Number(commande.mainDoeuvre) || 0);
    const totalTVA = (totalAvecRemise * (commande.taux || 0)) / 100;
    return { totalHT, remise, totalAvecRemise, totalTVA, totalTTC: totalAvecRemise + totalTVA };
  };

  const enregistrer = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/commandes/${id}`, {
        ...commande,
        ...recalculer(lignes),
        lignes,
      });
      setMessage("✅ Commande actualisée");
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
    setSaving(false);
  };

  const transferer = async () => {
    try {
      await axios.post(`/api/commandes/${id}/transfert`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Transfert impossible");
    }
  };

  const statut = STATUTS_COMMANDE[commande.statutC];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Commande {commande.numCommande}</h3>
          <Badge bg={statut?.color || "secondary"}>{statut?.label || commande.statutC}</Badge>{" "}
          {commande.serviceAchat && <Badge bg="info">Transférée au service achat</Badge>}
        </div>
        <div>
          <span className="me-2"><PdfButtons type="proforma" id={id} label="Proforma" /></span>
          {!commande.serviceAchat && (
            <Button variant="success" className="me-2" onClick={transferer}>
              <i className="bi bi-send me-1"></i>Transférer au service achat
            </Button>
          )}
          <Button variant="outline-secondary" onClick={() => router.push("/dashboard/devis")}>
            <i className="bi bi-arrow-left"></i>
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}><Form.Label>Date</Form.Label>
              <Form.Control type="date" value={commande.dateCommande?.slice(0, 10) || ""} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, dateCommande: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Client</Form.Label>
              <Form.Control value={commande.clientC || ""} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, clientC: e.target.value })} /></Col>
            <Col md={6}><Form.Label>Objet</Form.Label>
              <Form.Control value={commande.objetCommande || ""} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, objetCommande: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Délai d&apos;exécution</Form.Label>
              <Form.Control value={commande.delaisExecution || ""} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, delaisExecution: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Validité</Form.Label>
              <Form.Control value={commande.validiteCommande || ""} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, validiteCommande: e.target.value })} /></Col>
            <Col md={2}><Form.Label>Main d&apos;œuvre</Form.Label>
              <Form.Control type="number" value={commande.mainDoeuvre || 0} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, mainDoeuvre: Number(e.target.value) })} /></Col>
            <Col md={2}><Form.Label>Remise (%)</Form.Label>
              <Form.Control type="number" value={commande.tauxRemise || 0} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, tauxRemise: Number(e.target.value) })} /></Col>
            <Col md={2}><Form.Label>TVA (%)</Form.Label>
              <Form.Control type="number" value={commande.taux || 0} disabled={!modifiable}
                onChange={(e) => setCommande({ ...commande, taux: Number(e.target.value) })} /></Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <div className="table-responsive">
          <Table className="mb-0 align-middle" size="sm">
            <thead className="table-light">
              <tr>
                <th>Référence</th><th>Article</th><th style={{ width: 80 }}>Qté</th>
                <th style={{ width: 120 }}>P.U.</th><th style={{ width: 110 }}>Fr. transport</th>
                <th style={{ width: 110 }}>Autres</th><th className="text-end" style={{ width: 130 }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td><Form.Control size="sm" value={l.reference || ""} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "reference", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.articleM || ""} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "articleM", e.target.value)} /></td>
                  <td><Form.Control size="sm" type="number" value={l.quantite || 0} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "quantite", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.prixUnitaire || 0} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "prixUnitaire", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.fraisTransport || 0} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "fraisTransport", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.autreMontant || 0} disabled={!modifiable}
                    onChange={(e) => majLigne(i, "autreMontant", Number(e.target.value))} /></td>
                  <td className="text-end fw-semibold">{fmtMontant(l.prixTotalHT)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <div className="d-flex justify-content-between align-items-center">
        <div className="fs-5">
          Total TTC : <strong>{fmtMontant(recalculer(lignes).totalTTC)} {commande.deviseM}</strong>
        </div>
        {modifiable && (
          <Button size="lg" onClick={enregistrer} disabled={saving}>
            {saving ? "Enregistrement..." : "Actualiser la commande"}
          </Button>
        )}
      </div>
    </div>
  );
}
