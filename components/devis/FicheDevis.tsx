"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, InputGroup, Row, Table } from "react-bootstrap";
import axios from "axios";
import { fmtMontant } from "@/lib/format";
import { calculerLigne, calculerTotaux } from "@/lib/calculDevis";
import FicheClientModal from "@/components/tiers/FicheClientModal";

export interface LigneDevis {
  numSerie: string;
  reference: string;
  articleM: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  tauxMarge: number;
  valeurConvertisseur: number;
  tauxDeDouanement: number;
  fraisTransport: number;
  tauxBancaire: number;
  autreMontant: number;
  prixUnitaireHT: number;
  prixTotalHT: number;
  fournisseur?: string;
  fournisseurId?: string;
}

export const LIGNE_DEVIS_VIDE: LigneDevis = {
  numSerie: "", reference: "", articleM: "", description: "", quantite: 1,
  prixUnitaire: 0, tauxMarge: 0, valeurConvertisseur: 0, tauxDeDouanement: 0,
  fraisTransport: 0, tauxBancaire: 0, autreMontant: 0, prixUnitaireHT: 0,
  prixTotalHT: 0, fournisseur: "", fournisseurId: "",
};

const ENTETE_VIDE = {
  mainDoeuvre: 0, delaisExecution: "", taux: 0, modeReglement: "Selon le Client",
  deviseM: "FCFA", objetCommande: "", garantie: "", validiteCommande: "",
  tauxRemise: 0, numComm: "", totalPaye: 0,
};

const TITLE_COEF = "Coefficient multiplicateur (ex. 1,20) — 0 = sans effet";

type Props = {
  initial?: any;
  readOnly?: boolean;
  onSubmit: (payload: any) => Promise<void>;
  submitLabel?: string;
};

/**
 * FICHE DE SAISIE DEVIS (écran WinDev « NOUVEAU DEVIS ») : client,
 * 6 cases totaux, grille des lignes avec coefficients, bloc du bas.
 * Partagée par la création (/devis/nouveau) et l'actualisation (/devis/[id]).
 */
export default function FicheDevis({ initial, readOnly = false, onSubmit, submitLabel = "Valider la Commande" }: Props) {
  const [clients, setClients] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [clientId, setClientId] = useState(initial?.clientId || "");
  const [showClient, setShowClient] = useState(false);
  const [entete, setEntete] = useState<any>({ ...ENTETE_VIDE, ...(initial || {}), numComm: initial?.numComm || "" });
  const [lignes, setLignes] = useState<LigneDevis[]>(
    initial?.lignes?.length
      ? initial.lignes.map((l: any) => ({ ...LIGNE_DEVIS_VIDE, ...l, fournisseurId: l.fournisseurId || "" }))
      : [{ ...LIGNE_DEVIS_VIDE }]
  );
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    axios.get("/api/clients").then((r) => setClients(r.data)).catch(() => {});
    axios.get("/api/fournisseurs").then((r) => setFournisseurs(r.data)).catch(() => {});
  }, []);

  const client = clients.find((c) => c._id === clientId);
  const clientHorsListe = !clientId && initial?.clientC;

  const majLigne = (i: number, champ: keyof LigneDevis, valeur: any) => {
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = calculerLigne({ ...copie[i], [champ]: valeur });
      return copie;
    });
  };

  const lignesCalc = useMemo(() => lignes.map((l) => calculerLigne(l)), [lignes]);
  const totaux = useMemo(() => calculerTotaux(lignesCalc, entete), [lignesCalc, entete]);
  const sommeQte = lignesCalc.reduce((s, l) => s + (Number(l.quantite) || 0), 0);
  const sommeHT = lignesCalc.reduce((s, l) => s + (Number(l.prixTotalHT) || 0), 0);

  const valider = async () => {
    setErreur("");
    const lignesValides = lignesCalc.filter((l) => l.articleM || l.reference);
    if (!lignesValides.length) {
      setErreur("Saisissez au moins une ligne d'article");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        clientId: clientId || undefined,
        clientC: client ? client.nomPren : entete.clientC,
        contactC: client?.telephone,
        telephone: client?.telephone,
        mail: client?.mail,
        boitePostale: client?.boitePostale,
        mainDoeuvre: entete.mainDoeuvre,
        delaisExecution: entete.delaisExecution,
        taux: entete.taux,
        modeReglement: entete.modeReglement,
        deviseM: entete.deviseM,
        objetCommande: entete.objetCommande,
        garantie: entete.garantie,
        validiteCommande: entete.validiteCommande,
        tauxRemise: entete.tauxRemise,
        numComm: entete.numComm,
        lignes: lignesValides,
      });
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const cellNum = (i: number, champ: keyof LigneDevis) => (
    <Form.Control size="sm" type="number" value={lignes[i][champ] as number} disabled={readOnly}
      onChange={(e) => majLigne(i, champ, Number(e.target.value))} />
  );

  const caseTotal = (label: string, valeur: number, fort = false) => (
    <Col key={label}>
      <div className={`border rounded p-2 text-center h-100 ${fort ? "bg-primary text-white" : "bg-light"}`}>
        <div className="small">{label}</div>
        <div className="fw-bold">{fmtMontant(valeur)}</div>
      </div>
    </Col>
  );

  return (
    <div>
      {erreur && <div className="alert alert-danger">{erreur}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label>Client</Form.Label>
              <InputGroup>
                <Form.Select value={clientId} disabled={readOnly}
                  onChange={(e) => setClientId(e.target.value)}>
                  <option value="">
                    {clientHorsListe ? `${initial.clientC} (hors liste)` : "— Sélectionner —"}
                  </option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nomPren} {c.raisonSociale ? `(${c.raisonSociale})` : ""}
                    </option>
                  ))}
                </Form.Select>
                {!readOnly && (
                  <Button variant="outline-primary" title="Ajouter un client" onClick={() => setShowClient(true)}>
                    <i className="bi bi-plus-lg"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col md={8}>
              <Row className="g-2 row-cols-2 row-cols-md-3 row-cols-xl-6">
                {caseTotal("Montant Total HT", totaux.totalHT)}
                {caseTotal("Réduction", totaux.remise)}
                {caseTotal("HT avec Remise", totaux.totalAvecRemise)}
                {caseTotal("Total TVA", totaux.totalTVA)}
                {caseTotal("Total TTC à régler", totaux.totalTTC, true)}
                {caseTotal("Reste à payer", totaux.resteAPaye)}
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Lignes du devis</span>
          {!readOnly && (
            <Button size="sm" variant="outline-primary"
              onClick={() => setLignes([...lignes, { ...LIGNE_DEVIS_VIDE }])}>
              <i className="bi bi-plus-lg"></i> Ajouter une ligne
            </Button>
          )}
        </Card.Header>
        <div className="table-responsive">
          <Table className="mb-0 align-middle" size="sm" style={{ minWidth: 1600 }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: 90 }}>N°Série</th>
                <th style={{ width: 110 }}>Référence</th>
                <th style={{ minWidth: 160 }}>Article</th>
                <th style={{ minWidth: 160 }}>Description</th>
                <th style={{ width: 70 }}>Qté</th>
                <th style={{ width: 100 }}>Prix unitaire</th>
                <th style={{ width: 80 }} title={TITLE_COEF}>Marge (%)</th>
                <th style={{ width: 90 }} title={TITLE_COEF}>Valeur (FCFA)</th>
                <th style={{ width: 80 }} title={TITLE_COEF}>Douane (%)</th>
                <th style={{ width: 80 }} title={TITLE_COEF}>Transp. (%)</th>
                <th style={{ width: 80 }} title={TITLE_COEF}>Banque (%)</th>
                <th style={{ width: 100 }}>Autre Montant</th>
                <th style={{ width: 110 }} className="text-end">Prix unitaire HT</th>
                <th style={{ width: 120 }} className="text-end">Montant Total HT</th>
                <th style={{ width: 150 }}>Fournisseur</th>
                {!readOnly && <th style={{ width: 40 }}></th>}
              </tr>
            </thead>
            <tbody>
              {lignesCalc.map((l, i) => (
                <tr key={i}>
                  <td><Form.Control size="sm" value={l.numSerie || ""} disabled={readOnly}
                    onChange={(e) => majLigne(i, "numSerie", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.reference || ""} disabled={readOnly}
                    onChange={(e) => majLigne(i, "reference", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.articleM || ""} disabled={readOnly}
                    onChange={(e) => majLigne(i, "articleM", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.description || ""} disabled={readOnly}
                    onChange={(e) => majLigne(i, "description", e.target.value)} /></td>
                  <td>{cellNum(i, "quantite")}</td>
                  <td>{cellNum(i, "prixUnitaire")}</td>
                  <td>{cellNum(i, "tauxMarge")}</td>
                  <td>{cellNum(i, "valeurConvertisseur")}</td>
                  <td>{cellNum(i, "tauxDeDouanement")}</td>
                  <td>{cellNum(i, "fraisTransport")}</td>
                  <td>{cellNum(i, "tauxBancaire")}</td>
                  <td>{cellNum(i, "autreMontant")}</td>
                  <td className="text-end">{fmtMontant(l.prixUnitaireHT)}</td>
                  <td className="text-end fw-semibold">{fmtMontant(l.prixTotalHT)}</td>
                  <td>
                    <Form.Select size="sm" value={l.fournisseurId || ""} disabled={readOnly}
                      onChange={(e) => {
                        const f = fournisseurs.find((x) => x._id === e.target.value);
                        majLigne(i, "fournisseurId", e.target.value);
                        majLigne(i, "fournisseur", f?.nomPren || "");
                      }}>
                      <option value="">—</option>
                      {fournisseurs.map((f) => (
                        <option key={f._id} value={f._id}>{f.nomPren}</option>
                      ))}
                    </Form.Select>
                  </td>
                  {!readOnly && (
                    <td>
                      {lignes.length > 1 && (
                        <Button size="sm" variant="outline-danger"
                          onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>
                          <i className="bi bi-x"></i>
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-light fw-bold">
                <td colSpan={4} className="text-end">Somme</td>
                <td>{sommeQte}</td>
                <td colSpan={8}></td>
                <td className="text-end">{fmtMontant(sommeHT)}</td>
                <td colSpan={readOnly ? 1 : 2}></td>
              </tr>
            </tfoot>
          </Table>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}><Form.Label>Main d&apos;Oeuvre</Form.Label>
              <Form.Control type="number" value={entete.mainDoeuvre} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, mainDoeuvre: Number(e.target.value) })} /></Col>
            <Col md={3}><Form.Label>Délais (Jours)</Form.Label>
              <Form.Control value={entete.delaisExecution || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, delaisExecution: e.target.value })} /></Col>
            <Col md={3}><Form.Label>TVA(%)</Form.Label>
              <Form.Control type="number" value={entete.taux} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, taux: Number(e.target.value) })} /></Col>
            <Col md={3}><Form.Label>Mode Règlement</Form.Label>
              <Form.Control value={entete.modeReglement || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, modeReglement: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Devise</Form.Label>
              <Form.Select value={entete.deviseM || "FCFA"} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, deviseM: e.target.value })}>
                <option value="FCFA">FCFA</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Form.Select></Col>
            <Col md={3}><Form.Label>Garantie</Form.Label>
              <Form.Control value={entete.garantie || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, garantie: e.target.value })} /></Col>
            <Col md={3}><Form.Label>Validité (Jrs)</Form.Label>
              <Form.Control value={entete.validiteCommande || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, validiteCommande: e.target.value })} /></Col>
            <Col md={3}><Form.Label>REMISE(%)</Form.Label>
              <Form.Control type="number" value={entete.tauxRemise} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, tauxRemise: Number(e.target.value) })} /></Col>
            <Col md={6}><Form.Label>Objet Proforma</Form.Label>
              <Form.Control as="textarea" rows={2} value={entete.objetCommande || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, objetCommande: e.target.value })} /></Col>
            <Col md={6}><Form.Label>N°PROFORMA</Form.Label>
              <Form.Control value={entete.numComm || ""} disabled={readOnly}
                onChange={(e) => setEntete({ ...entete, numComm: e.target.value })} /></Col>
          </Row>
          {!readOnly && (
            <div className="mt-3">
              <Button size="lg" className="w-100 w-sm-auto" onClick={valider} disabled={saving}>
                {saving ? "Enregistrement..." : submitLabel}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      <FicheClientModal
        show={showClient}
        onHide={() => setShowClient(false)}
        onSaved={(nouveau) => {
          setClients((cs) => [nouveau, ...cs]);
          setClientId(nouveau._id);
          setShowClient(false);
        }}
      />
    </div>
  );
}
