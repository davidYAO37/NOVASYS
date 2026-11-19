"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Table } from "react-bootstrap";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, STATUTS_ACHAT, STATUTS_COMMANDE } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";
import FicheFournisseurModal from "@/components/tiers/FicheFournisseurModal";
import FicheTransitaireModal from "@/components/tiers/FicheTransitaireModal";
import { calculerTotauxAchat } from "@/lib/calculAchat";

/**
 * SERVICE ACHAT (FEN_SERVICE_ACHAT) : liste des devis reçus/traités de la
 * période ; édition des bons de commande — un bon par fournisseur, choix
 * des lignes et quantités partielles, clôture manuelle possible.
 */
export default function ServiceAchatPage() {
  const [devis, setDevis] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [transitaires, setTransitaires] = useState<any[]>([]);
  const [transitaireId, setTransitaireId] = useState("");
  const [showTransitaire, setShowTransitaire] = useState(false);
  const [fraisTransport, setFraisTransport] = useState(0);
  const [autreMontant, setAutreMontant] = useState(0);
  const [tauxDouane, setTauxDouane] = useState(0);
  const [commande, setCommande] = useState<any>(null);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [qtes, setQtes] = useState<Record<number, number>>({});
  const [prix, setPrix] = useState<Record<number, number>>({});
  const [fournisseurId, setFournisseurId] = useState("");
  const [showFournisseur, setShowFournisseur] = useState(false);
  const [tva, setTva] = useState(18);
  const [objet, setObjet] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageModal, setMessageModal] = useState<{ type: string; texte: string } | null>(null);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [apercuBcId, setApercuBcId] = useState<string | null>(null);
  const [renvoi, setRenvoi] = useState<any>(null);
  const [motifRenvoi, setMotifRenvoi] = useState("");
  const [erreurRenvoi, setErreurRenvoi] = useState("");
  const [me, setMe] = useState<any>(null);

  const charger = useCallback(() => {
    axios.get("/api/commandes", { params: { du, au, recues: "1" } })
      .then((r) => setDevis(r.data)).catch(() => {});
  }, [du, au]);

  useEffect(() => {
    charger();
    axios.get("/api/fournisseurs").then((r) => setFournisseurs(r.data)).catch(() => {});
    axios.get("/api/transitaires").then((r) => setTransitaires(r.data)).catch(() => {});
    axios.get("/api/me").then((r) => setMe(r.data?.user)).catch(() => {});
  }, [charger]);

  const rechargerCommande = async (id: string) => {
    const r = await axios.get(`/api/commandes/${id}`);
    setCommande(r.data);
    return r.data;
  };

  const ouvrir = async (c: any) => {
    setMessageModal(null);
    setFournisseurId("");
    setDateLivraison("");
    setTransitaireId("");
    setFraisTransport(0);
    setAutreMontant(0);
    setTauxDouane(0);
    setSelection(new Set());
    setQtes({});
    setPrix({});
    const data = await rechargerCommande(c._id);
    setObjet(data.objetCommande || "");
  };

  const cloturer = async (c: any) => {
    if (!confirm(`Clôturer le devis ${c.numCommande} ? Les lignes restantes ne seront plus commandées.`)) return;
    try {
      await axios.post(`/api/commandes/${c._id}/cloture`);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur lors de la clôture");
    }
  };

  const rouvrir = async (c: any) => {
    if (!confirm(`Rouvrir le devis ${c.numCommande} ?`)) return;
    try {
      await axios.delete(`/api/commandes/${c._id}/cloture`);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur lors de la réouverture");
    }
  };

  const renvoyer = async () => {
    setErreurRenvoi("");
    try {
      await axios.post(`/api/commandes/${renvoi._id}/renvoi`, { motif: motifRenvoi });
      setRenvoi(null);
      charger();
    } catch (e: any) {
      setErreurRenvoi(e.response?.data?.message || "Erreur lors du renvoi");
    }
  };

  const fournisseur = fournisseurs.find((f) => f._id === fournisseurId);
  const transitaire = transitaires.find((t) => t._id === transitaireId);

  const lignesSel = useMemo(
    () =>
      (commande?.lignes || [])
        .map((l: any, i: number) => ({ ...l, _index: i }))
        .filter((l: any) => selection.has(l._index)),
    [commande, selection]
  );

  const totaux = useMemo(
    () =>
      calculerTotauxAchat(
        lignesSel.map((l: any) => ({
          quantite: qtes[l._index] ?? l.qteRestante ?? l.quantite,
          prixAchat: prix[l._index] ?? l.prixUnitaire ?? 0,
        })),
        { fraisTransport, autreMontant, tauxDouane, taux: tva }
      ),
    [lignesSel, qtes, prix, tva, fraisTransport, autreMontant, tauxDouane]
  );

  const editerBonCommande = async () => {
    setMessageModal(null);
    if (!fournisseurId) {
      setMessageModal({ type: "warning", texte: "Choisissez le fournisseur" });
      return;
    }
    if (!lignesSel.length) {
      setMessageModal({ type: "warning", texte: "Cochez au moins un article" });
      return;
    }
    setSaving(true);
    try {
      const r = await axios.post("/api/achats", {
        fournisseurId,
        fournisseur: fournisseur?.nomPren,
        contactF: fournisseur?.telephone,
        commandeId: commande._id,
        numCommande: commande.numCommande,
        numComm: commande.numComm,
        numAchatProfor: commande.numCommande,
        taux: tva,
        dateLivraison: dateLivraison || undefined,
        transitaireId: transitaireId || undefined,
        fraisTransport,
        autreMontant,
        tauxDouane,
        lignes: lignesSel.map((l: any) => ({
          ligneCdeId: l._id,
          reference: l.reference,
          articleM: l.articleM,
          description: l.description,
          quantite: qtes[l._index] ?? l.qteRestante ?? l.quantite,
          prixAchat: prix[l._index] ?? l.prixUnitaire ?? 0,
          observations: objet,
        })),
      });
      const nouvelle = await rechargerCommande(commande._id);
      setFournisseurId("");
      setDateLivraison("");
      setTransitaireId("");
      setFraisTransport(0);
      setAutreMontant(0);
      setTauxDouane(0);
      setSelection(new Set());
      setQtes({});
      setPrix({});
      const statut = r.data?.commande?.statutC || nouvelle?.statutC;
      setMessageModal({
        type: "success",
        texte:
          statut === "traitee"
            ? `${r.data.numAchat} créé pour ${fournisseur?.nomPren || "le fournisseur"} — Toutes les lignes sont commandées`
            : `${r.data.numAchat} créé pour ${fournisseur?.nomPren || "le fournisseur"}`,
      });
      charger();
    } catch (e: any) {
      setMessageModal({ type: "danger", texte: e.response?.data?.message || "Erreur lors de l'édition" });
    }
    setSaving(false);
  };

  const cloturee = commande?.statutC === "traitee";
  const aAction = (code: string) =>
    me?.permissions?.actions?.includes("*") || me?.permissions?.actions?.includes(code);

  return (
    <div>
      <h3 className="mb-3 titre-page">Service achat — devis reçus</h3>
      {message && <div className="alert alert-warning">{message}</div>}

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
                  <Badge bg={STATUTS_COMMANDE[d.statutC]?.color || "secondary"} className="badge-statut">
                    {STATUTS_COMMANDE[d.statutC]?.label || d.statutC}
                  </Badge>
                  {d.bonAchat && <div className="small text-muted mt-1">{d.bonAchat}</div>}
                </td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Proforma"
                    onClick={() => setApercuId(d._id)}>
                    <i className="bi bi-file-earmark-pdf"></i>
                  </Button>
                  {["en_cours", "partielle"].includes(d.statutC) && (
                    <>
                      <Button size="sm" variant="outline-success" className="me-1"
                        onClick={() => ouvrir(d)}>
                        <i className="bi bi-bag-plus me-1"></i>Bons de commande
                      </Button>
                      {aAction("cloture_commande") && (
                        <Button size="sm" variant="outline-danger"
                          onClick={() => cloturer(d)}>
                          <i className="bi bi-lock me-1"></i>Clôturer
                        </Button>
                      )}
                      {d.statutC === "en_cours" && !d.bonAchat && aAction("renvoi_devis") && (
                        <Button size="sm" variant="outline-warning" className="ms-1" title="Renvoyer au commercial"
                          onClick={() => { setRenvoi(d); setMotifRenvoi(""); setErreurRenvoi(""); }}>
                          <i className="bi bi-arrow-return-left me-1"></i>Renvoyer
                        </Button>
                      )}
                    </>
                  )}
                  {d.clotureManuelle && aAction("cloture_commande") && (
                    <Button size="sm" variant="outline-warning" onClick={() => rouvrir(d)}>
                      <i className="bi bi-unlock me-1"></i>Rouvrir
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

      {/* Renvoi du devis au commercial */}
      <Modal show={!!renvoi} onHide={() => setRenvoi(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Renvoyer le devis {renvoi?.numCommande} au commercial</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {erreurRenvoi && <div className="alert alert-danger">{erreurRenvoi}</div>}
          <p>Commercial : <strong>{renvoi?.saisiePar}</strong></p>
          <Form.Group>
            <Form.Label>Motif du renvoi *</Form.Label>
            <Form.Control as="textarea" rows={3} value={motifRenvoi}
              onChange={(e) => setMotifRenvoi(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRenvoi(null)}>Annuler</Button>
          <Button variant="warning" onClick={renvoyer} disabled={!motifRenvoi.trim()}>
            Renvoyer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bons de commande du devis */}
      <Modal show={!!commande} onHide={() => setCommande(null)} size="xl" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Bons de commande — {commande?.numCommande}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {messageModal && (
            <div className={`alert alert-${messageModal.type}`}>{messageModal.texte}</div>
          )}

          {(commande?.achats || []).length > 0 && (
            <>
              <div className="mb-2 fw-semibold">Bons déjà émis pour ce devis :</div>
              <Table responsive size="sm" hover className="mb-3">
                <thead>
                  <tr>
                    <th>N°</th><th>Date</th><th>Fournisseur</th>
                    <th className="text-end">Total TTC</th><th>Statut</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {commande.achats.map((a: any) => (
                    <tr key={a._id}>
                      <td className="fw-semibold">{a.numAchat}</td>
                      <td>{fmtDate(a.dateAchat)}</td>
                      <td>{a.fournisseur}</td>
                      <td className="text-end">{fmtMontant(a.totalTTC)}</td>
                      <td>
                        <Badge bg={STATUTS_ACHAT[a.statutAchat]?.color || "secondary"}>
                          {STATUTS_ACHAT[a.statutAchat]?.label || a.statutAchat}
                        </Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" title="Aperçu PDF"
                          onClick={() => setApercuBcId(a._id)}>
                          <i className="bi bi-file-earmark-pdf"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}

          {cloturee ? (
            <div className="alert alert-success mb-0">Toutes les lignes sont commandées</div>
          ) : (
            <>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Label>Choisir le fournisseur *</Form.Label>
                  <InputGroup>
                    <Form.Select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
                      <option value="">— Sélectionner —</option>
                      {fournisseurs.map((f) => (
                        <option key={f._id} value={f._id}>{f.nomPren}</option>
                      ))}
                    </Form.Select>
                    <Button variant="outline-primary" title="Ajouter un fournisseur"
                      onClick={() => setShowFournisseur(true)}>
                      <i className="bi bi-plus-lg"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Label>TVA (%)</Form.Label>
                  <Form.Control type="number" value={tva} onChange={(e) => setTva(Number(e.target.value))} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Label>Date de livraison</Form.Label>
                  <Form.Control type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Form.Label>Objet</Form.Label>
                  <Form.Control value={objet} onChange={(e) => setObjet(e.target.value)} />
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Label>Transitaire</Form.Label>
                  <InputGroup>
                    <Form.Select value={transitaireId} onChange={(e) => setTransitaireId(e.target.value)}>
                      <option value="">— Aucun —</option>
                      {transitaires.map((t) => (
                        <option key={t._id} value={t._id}>{t.nom}</option>
                      ))}
                    </Form.Select>
                    <Button variant="outline-primary" title="Ajouter un transitaire"
                      onClick={() => setShowTransitaire(true)}>
                      <i className="bi bi-plus-lg"></i>
                    </Button>
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Label>Transport (FCFA)</Form.Label>
                  <Form.Control type="number" min={0} value={fraisTransport}
                    onChange={(e) => setFraisTransport(Number(e.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label>Autre montant (FCFA)</Form.Label>
                  <Form.Control type="number" min={0} value={autreMontant}
                    onChange={(e) => setAutreMontant(Number(e.target.value))} />
                </Col>
                <Col md={2}>
                  <Form.Label>Douane (%)</Form.Label>
                  <Form.Control type="number" min={0} value={tauxDouane}
                    onChange={(e) => setTauxDouane(Number(e.target.value))} />
                </Col>
              </Row>

              <div className="mb-2 fw-semibold">Cocher les articles à commander chez le fournisseur :</div>
              <Table responsive size="sm" hover>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th><th>Référence</th><th>Article</th>
                    <th className="text-end">Qté devis</th>
                    <th className="text-end">Déjà commandé</th>
                    <th className="text-end">Reste</th>
                    <th className="text-end" style={{ width: 110 }}>Qté à commander</th>
                    <th className="text-end" style={{ width: 130 }}>Prix d'achat</th>
                    <th className="text-end">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {(commande?.lignes || []).map((l: any, i: number) => {
                    const reste = l.qteRestante ?? l.quantite;
                    const epuisee = reste <= 0;
                    const qte = qtes[i] ?? reste;
                    const pu = prix[i] ?? l.prixUnitaire ?? 0;
                    return (
                      <tr key={i} className={epuisee ? "text-muted" : ""}>
                        <td>
                          <Form.Check checked={selection.has(i)} disabled={epuisee}
                            onChange={(e) => {
                              const s = new Set(selection);
                              if (e.target.checked) {
                                s.add(i);
                                setQtes((q) => ({ ...q, [i]: q[i] ?? reste }));
                                setPrix((p) => ({ ...p, [i]: p[i] ?? l.prixUnitaire ?? 0 }));
                              } else {
                                s.delete(i);
                              }
                              setSelection(s);
                            }} />
                        </td>
                        <td>{l.reference}</td>
                        <td>
                          {l.articleM}
                          {epuisee && <Badge bg="success" className="ms-2">Commandée</Badge>}
                        </td>
                        <td className="text-end">{l.quantite}</td>
                        <td className="text-end">{l.qteCommandee ?? 0}</td>
                        <td className="text-end">{reste}</td>
                        <td>
                          <Form.Control size="sm" type="number" min={0.000001} max={reste}
                            value={qte} disabled={epuisee || !selection.has(i)}
                            onChange={(e) => setQtes((q) => ({ ...q, [i]: Number(e.target.value) }))} />
                        </td>
                        <td>
                          <Form.Control size="sm" type="number" min={0}
                            value={pu} disabled={epuisee || !selection.has(i)}
                            onChange={(e) => setPrix((p) => ({ ...p, [i]: Number(e.target.value) }))} />
                        </td>
                        <td className="text-end">{selection.has(i) ? fmtMontant(qte * pu) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              <div className="text-end">
                {(totaux.fraisTransport > 0 || totaux.autreMontant > 0 || totaux.montantDouane > 0) && (
                  <div>Sous-total articles HT : <strong>{fmtMontant(totaux.sousTotalHT)} FCFA</strong></div>
                )}
                {totaux.fraisTransport > 0 && (
                  <div>Transport{transitaire ? ` — ${transitaire.nom}` : ""} : <strong>{fmtMontant(totaux.fraisTransport)} FCFA</strong></div>
                )}
                {totaux.autreMontant > 0 && (
                  <div>Autre montant : <strong>{fmtMontant(totaux.autreMontant)} FCFA</strong></div>
                )}
                {totaux.montantDouane > 0 && (
                  <div>Douane ({totaux.tauxDouane} %) : <strong>{fmtMontant(totaux.montantDouane)} FCFA</strong></div>
                )}
                <div>Total HT : <strong>{fmtMontant(totaux.totalHT)} FCFA</strong></div>
                <div>TVA ({tva} %) : <strong>{fmtMontant(totaux.totalTVA)} FCFA</strong></div>
                <div className="fs-5">Total TTC : <strong>{fmtMontant(totaux.totalTTC)} FCFA</strong></div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCommande(null)}>Fermer</Button>
          {!cloturee && (
            <Button onClick={editerBonCommande} disabled={saving}>
              {saving ? "Édition..." : "Valider le bon de commande"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <FicheFournisseurModal
        show={showFournisseur}
        onHide={() => setShowFournisseur(false)}
        onSaved={(nouveau) => {
          setFournisseurs((fs) => [nouveau, ...fs]);
          setFournisseurId(nouveau._id);
          setShowFournisseur(false);
        }}
      />

      <FicheTransitaireModal
        show={showTransitaire}
        onHide={() => setShowTransitaire(false)}
        onSaved={(nouveau) => {
          setTransitaires((ts) => [nouveau, ...ts]);
          setTransitaireId(nouveau._id);
          setShowTransitaire(false);
        }}
      />

      <PdfPreviewModal type="proforma" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
      <PdfPreviewModal type="bon-commande" id={apercuBcId} show={!!apercuBcId} onHide={() => setApercuBcId(null)} />
    </div>
  );
}
