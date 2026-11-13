"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import { fmtMontant } from "@/lib/format";

const VIDE_ARTICLE = { reference: "", designationA: "", prixVente: 0, prixAchatA: 0, famille: "", marque: "", seuilAlerte: 0 };

/** Stock : articles + quantités + mouvements (entrées/sorties). */
export default function StockPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [showArticle, setShowArticle] = useState(false);
  const [article, setArticle] = useState<any>(VIDE_ARTICLE);
  const [showMvt, setShowMvt] = useState(false);
  const [mvt, setMvt] = useState({ sens: "entree", reference: "", quantite: 1, prixAchat: 0, prixUnitaire: 0, motif: "" });
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/articles", { params: { q: recherche || undefined } })
      .then((r) => setArticles(r.data)).catch(() => {});
    axios.get("/api/stock").then((r) => setStocks(r.data)).catch(() => {});
  }, [recherche]);

  useEffect(() => { charger(); }, [charger]);

  const stockDe = (ref: string) => stocks.find((s) => s.reference === ref);

  const creerArticle = async () => {
    setMessage("");
    try {
      await axios.post("/api/articles", article);
      setShowArticle(false);
      setArticle(VIDE_ARTICLE);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
  };

  const mouvement = async () => {
    setMessage("");
    try {
      await axios.post("/api/stock", mvt);
      setShowMvt(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Mouvement impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Articles et stock</h3>
        <div>
          <Button variant="success" className="me-2" onClick={() => { setMvt({ ...mvt, sens: "entree" }); setShowMvt(true); }}>
            <i className="bi bi-box-arrow-in-down me-1"></i>Entrée
          </Button>
          <Button variant="danger" className="me-2" onClick={() => { setMvt({ ...mvt, sens: "sortie" }); setShowMvt(true); }}>
            <i className="bi bi-box-arrow-up me-1"></i>Sortie
          </Button>
          <Button onClick={() => setShowArticle(true)}>
            <i className="bi bi-plus-lg me-1"></i>Nouvel article
          </Button>
        </div>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Form.Control placeholder="Rechercher (référence, désignation)..."
            value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Référence</th><th>Désignation</th><th>Famille</th><th>Marque</th>
              <th className="text-end">Prix achat</th><th className="text-end">Prix vente</th>
              <th className="text-end">En stock</th><th className="text-end">Seuil</th><th></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => {
              const s = stockDe(a.reference);
              const qte = s?.qteEnStock ?? 0;
              const alerte = (a.seuilAlerte || 0) > 0 && qte <= a.seuilAlerte;
              return (
                <tr key={a._id}>
                  <td className="fw-semibold">{a.reference}</td>
                  <td>{a.designationA}</td>
                  <td>{a.famille}</td>
                  <td>{a.marque}</td>
                  <td className="text-end">{fmtMontant(a.prixAchatA)}</td>
                  <td className="text-end">{fmtMontant(a.prixVente)}</td>
                  <td className="text-end">
                    {alerte
                      ? <Badge bg="danger">{qte}</Badge>
                      : <Badge bg="success">{qte}</Badge>}
                  </td>
                  <td className="text-end">{a.seuilAlerte || 0}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" onClick={() => {
                      setMvt({ ...mvt, reference: a.reference });
                      setShowMvt(true);
                    }}>
                      <i className="bi bi-arrow-left-right"></i>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!articles.length && (
              <tr><td colSpan={9} className="text-center text-muted py-4">Aucun article</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Nouvel article */}
      <Modal show={showArticle} onHide={() => setShowArticle(false)}>
        <Modal.Header closeButton><Modal.Title>Nouvel article</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Référence *</Form.Label>
            <Form.Control value={article.reference} onChange={(e) => setArticle({ ...article, reference: e.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Désignation *</Form.Label>
            <Form.Control value={article.designationA} onChange={(e) => setArticle({ ...article, designationA: e.target.value })} /></Form.Group>
          <Row className="g-2">
            <Col><Form.Label>Prix achat</Form.Label>
              <Form.Control type="number" value={article.prixAchatA} onChange={(e) => setArticle({ ...article, prixAchatA: Number(e.target.value) })} /></Col>
            <Col><Form.Label>Prix vente</Form.Label>
              <Form.Control type="number" value={article.prixVente} onChange={(e) => setArticle({ ...article, prixVente: Number(e.target.value) })} /></Col>
          </Row>
          <Row className="g-2 mt-1">
            <Col><Form.Label>Famille</Form.Label>
              <Form.Control value={article.famille} onChange={(e) => setArticle({ ...article, famille: e.target.value })} /></Col>
            <Col><Form.Label>Marque</Form.Label>
              <Form.Control value={article.marque} onChange={(e) => setArticle({ ...article, marque: e.target.value })} /></Col>
          </Row>
          <Form.Group className="mt-2"><Form.Label>Seuil d&apos;alerte stock</Form.Label>
            <Form.Control type="number" value={article.seuilAlerte} onChange={(e) => setArticle({ ...article, seuilAlerte: Number(e.target.value) })} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowArticle(false)}>Annuler</Button>
          <Button onClick={creerArticle}>Valider</Button>
        </Modal.Footer>
      </Modal>

      {/* Mouvement */}
      <Modal show={showMvt} onHide={() => setShowMvt(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{mvt.sens === "entree" ? "Entrée" : "Sortie"} de stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Référence article *</Form.Label>
            <Form.Select value={mvt.reference} onChange={(e) => setMvt({ ...mvt, reference: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {articles.map((a) => <option key={a._id} value={a.reference}>{a.reference} — {a.designationA}</option>)}
            </Form.Select></Form.Group>
          <Row className="g-2">
            <Col><Form.Label>Quantité *</Form.Label>
              <Form.Control type="number" value={mvt.quantite} onChange={(e) => setMvt({ ...mvt, quantite: Number(e.target.value) })} /></Col>
            <Col>
              {mvt.sens === "entree" ? (
                <><Form.Label>Prix d&apos;achat</Form.Label>
                  <Form.Control type="number" value={mvt.prixAchat} onChange={(e) => setMvt({ ...mvt, prixAchat: Number(e.target.value) })} /></>
              ) : (
                <><Form.Label>Prix unitaire</Form.Label>
                  <Form.Control type="number" value={mvt.prixUnitaire} onChange={(e) => setMvt({ ...mvt, prixUnitaire: Number(e.target.value) })} /></>
              )}
            </Col>
          </Row>
          <Form.Group className="mt-2"><Form.Label>Motif / Observations</Form.Label>
            <Form.Control value={mvt.motif} onChange={(e) => setMvt({ ...mvt, motif: e.target.value })} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMvt(false)}>Annuler</Button>
          <Button onClick={mouvement}>Valider</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
