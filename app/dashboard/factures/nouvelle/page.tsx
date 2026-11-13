"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { useRouter } from "next/navigation";
import axios from "axios";
import dayjs from "dayjs";
import { fmtMontant, MODES_REGLEMENT } from "@/lib/format";

/**
 * NOUVELLE FACTURE : choisir le client / la proforma, vérifier les lignes,
 * renseigner le numéro de facture — à l'enregistrement le bon de
 * livraison est créé automatiquement.
 */
export default function NouvelleFacturePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [commandes, setCommandes] = useState<any[]>([]);
  const [commandeId, setCommandeId] = useState("");
  const [commande, setCommande] = useState<any>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [entete, setEntete] = useState({
    numFacture: "", objetFacture: "", observationFacture: "",
    modeReglement: "", totalPaye: 0, dateLivraison: dayjs().format("YYYY-MM-DD"),
  });
  const [taux, setTaux] = useState(18);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    axios.get("/api/clients").then((r) => setClients(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) { setCommandes([]); return; }
    // Proformas du client (traitées ou en attente de facturation)
    axios.get("/api/commandes").then((r) => {
      setCommandes(r.data.filter((c: any) => c.clientId === clientId && !c.factureEditee));
    }).catch(() => {});
  }, [clientId]);

  const chargerProforma = async (cid: string) => {
    setCommandeId(cid);
    if (!cid) { setCommande(null); setLignes([]); return; }
    const r = await axios.get(`/api/commandes/${cid}`);
    setCommande(r.data);
    setTaux(r.data.taux ?? 18);
    setEntete((e) => ({ ...e, objetFacture: r.data.objetCommande || "" }));
    setLignes((r.data.lignes || []).map((l: any) => ({
      reference: l.reference, articleM: l.articleM, description: l.description,
      quantite: l.quantite, prixUnitaire: l.prixUnitaire, prixUnitaireHT: l.prixUnitaireHT,
      fraisTransport: l.fraisTransport, prixTotalHT: l.prixTotalHT,
      numSerie: l.numSerie, tauxMarge: l.tauxMarge, tauxDeDouanement: l.tauxDeDouanement,
      tauxBancaire: l.tauxBancaire, autreMontant: l.autreMontant, valeurConvertisseur: l.valeurConvertisseur,
    })));
  };

  const client = clients.find((c) => c._id === clientId);

  const majLigne = (i: number, champ: string, valeur: any) => {
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = { ...copie[i], [champ]: valeur };
      const l = copie[i];
      l.prixTotalHT = (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) + (Number(l.fraisTransport) || 0) + (Number(l.autreMontant) || 0);
      return copie;
    });
  };

  const totaux = useMemo(() => {
    const totalHT = lignes.reduce((s, l) => s + (l.prixTotalHT || 0), 0);
    const totalTVA = (totalHT * taux) / 100;
    return { totalHT, totalTVA, totalTTC: totalHT + totalTVA };
  }, [lignes, taux]);

  const enregistrer = async () => {
    setErreur("");
    if (!clientId || !lignes.length) {
      setErreur("Choisissez le client et chargez une proforma");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/factures", {
        numFacture: entete.numFacture || undefined,
        clientId,
        clientC: client?.nomPren,
        mail: client?.mail,
        contactC: client?.telephone,
        adresseGeo: client?.adresseGeo,
        commandeId: commandeId || undefined,
        numCommande: commande?.numCommande,
        numComm: commande?.numComm,
        totalHTFacture: totaux.totalHT,
        totalAvecRemise: totaux.totalHT,
        totalTVA: totaux.totalTVA,
        totalTTC: totaux.totalTTC,
        totalPaye: entete.totalPaye,
        taux,
        objetFacture: entete.objetFacture,
        observationFacture: entete.observationFacture,
        modeReglement: entete.modeReglement,
        dateLivraison: entete.dateLivraison,
        lignes,
      });
      router.push("/dashboard/factures");
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Nouvelle facture</h3>
        <Button variant="outline-secondary" onClick={() => router.push("/dashboard/factures")}>
          <i className="bi bi-arrow-left me-1"></i>Retour
        </Button>
      </div>

      {erreur && <div className="alert alert-danger">{erreur}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label>Choisir le client *</Form.Label>
              <Form.Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.nomPren}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Proforma / Commande</Form.Label>
              <Form.Select value={commandeId} onChange={(e) => chargerProforma(e.target.value)} disabled={!clientId}>
                <option value="">— Sélectionner —</option>
                {commandes.map((c) => (
                  <option key={c._id} value={c._id}>{c.numCommande} — {fmtMontant(c.totalTTC)}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>N° de facture</Form.Label>
              <Form.Control placeholder="Automatique si vide" value={entete.numFacture}
                onChange={(e) => setEntete({ ...entete, numFacture: e.target.value })} />
            </Col>
            <Col md={3}>
              <Form.Label>Date de livraison</Form.Label>
              <Form.Control type="date" value={entete.dateLivraison}
                onChange={(e) => setEntete({ ...entete, dateLivraison: e.target.value })} />
            </Col>
            <Col md={4}>
              <Form.Label>Objet</Form.Label>
              <Form.Control value={entete.objetFacture}
                onChange={(e) => setEntete({ ...entete, objetFacture: e.target.value })} />
            </Col>
            <Col md={2}>
              <Form.Label>TVA (%)</Form.Label>
              <Form.Control type="number" value={taux} onChange={(e) => setTaux(Number(e.target.value))} />
            </Col>
            <Col md={3}>
              <Form.Label>Mode de règlement</Form.Label>
              <Form.Select value={entete.modeReglement}
                onChange={(e) => setEntete({ ...entete, modeReglement: e.target.value })}>
                <option value="">—</option>
                {MODES_REGLEMENT.map((m) => <option key={m}>{m}</option>)}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Montant payé (acompte)</Form.Label>
              <Form.Control type="number" value={entete.totalPaye}
                onChange={(e) => setEntete({ ...entete, totalPaye: Number(e.target.value) })} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header>Lignes de la proforma — vérifier ou actualiser</Card.Header>
        <div className="table-responsive">
          <Table className="mb-0 align-middle" size="sm">
            <thead className="table-light">
              <tr>
                <th>Référence</th><th style={{ minWidth: 200 }}>Article</th>
                <th style={{ width: 80 }}>Qté</th><th style={{ width: 120 }}>P.U.</th>
                <th style={{ width: 110 }}>Fr. transport</th><th style={{ width: 110 }}>Autres</th>
                <th className="text-end" style={{ width: 130 }}>Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td><Form.Control size="sm" value={l.reference || ""}
                    onChange={(e) => majLigne(i, "reference", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.articleM || ""}
                    onChange={(e) => majLigne(i, "articleM", e.target.value)} /></td>
                  <td><Form.Control size="sm" type="number" value={l.quantite || 0}
                    onChange={(e) => majLigne(i, "quantite", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.prixUnitaire || 0}
                    onChange={(e) => majLigne(i, "prixUnitaire", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.fraisTransport || 0}
                    onChange={(e) => majLigne(i, "fraisTransport", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.autreMontant || 0}
                    onChange={(e) => majLigne(i, "autreMontant", Number(e.target.value))} /></td>
                  <td className="text-end fw-semibold">{fmtMontant(l.prixTotalHT)}</td>
                </tr>
              ))}
              {!lignes.length && (
                <tr><td colSpan={7} className="text-center text-muted py-3">
                  Sélectionnez un client puis une proforma pour charger les lignes
                </td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Label>Observation</Form.Label>
              <Form.Control as="textarea" rows={2} value={entete.observationFacture}
                onChange={(e) => setEntete({ ...entete, observationFacture: e.target.value })} />
              <Button size="lg" className="mt-3" onClick={enregistrer} disabled={saving || !lignes.length}>
                {saving ? "Enregistrement..." : "Enregistrer la facture (+ BL auto)"}
              </Button>
            </Col>
            <Col md={6}>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr><td>Total HT</td><td className="text-end fw-bold">{fmtMontant(totaux.totalHT)}</td></tr>
                  <tr><td>TVA ({taux}%)</td><td className="text-end">{fmtMontant(totaux.totalTVA)}</td></tr>
                  <tr className="table-primary">
                    <td className="fw-bold">Total TTC</td>
                    <td className="text-end fw-bold">{fmtMontant(totaux.totalTTC)} FCFA</td>
                  </tr>
                  <tr><td>Reste à payer</td><td className="text-end text-warning fw-bold">
                    {fmtMontant(totaux.totalTTC - (entete.totalPaye || 0))}</td></tr>
                </tbody>
              </Table>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
