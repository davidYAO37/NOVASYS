"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { useRouter } from "next/navigation";
import axios from "axios";
import { fmtMontant } from "@/lib/format";

interface Ligne {
  reference: string;
  articleM: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  prixUnitaireHT: number;
  fraisTransport: number;
  prixTotalHT: number;
  tauxMarge: number;
  tauxDeDouanement: number;
  tauxBancaire: number;
  autreMontant: number;
  valeurConvertisseur: number;
  fournisseur?: string;
}

const LIGNE_VIDE: Ligne = {
  reference: "", articleM: "", description: "", quantite: 1,
  prixUnitaire: 0, prixUnitaireHT: 0, fraisTransport: 0, prixTotalHT: 0,
  tauxMarge: 0, tauxDeDouanement: 0, tauxBancaire: 0, autreMontant: 0,
  valeurConvertisseur: 0,
};

/**
 * FICHE DE SAISIE DU DEVIS : choix du client, lignes d'articles
 * (quantité, montant unitaire, marges...), totaux, enregistrement.
 */
export default function NouveauDevisPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [entete, setEntete] = useState({
    objetCommande: "", delaisExecution: "", validiteCommande: "",
    garantie: "", mainDoeuvre: 0, tauxRemise: 0, taux: 0, deviseM: "FCFA",
  });
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    axios.get("/api/clients").then((r) => setClients(r.data)).catch(() => {});
  }, []);

  const client = clients.find((c) => c._id === clientId);

  const majLigne = (i: number, champ: keyof Ligne, valeur: any) => {
    setLignes((ls) => {
      const copie = [...ls];
      copie[i] = { ...copie[i], [champ]: valeur };
      const l = copie[i];
      // Prix total HT = qté * PU + frais transport + autres montants
      l.prixTotalHT =
        (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) +
        (Number(l.fraisTransport) || 0) +
        (Number(l.autreMontant) || 0);
      return copie;
    });
  };

  const totaux = useMemo(() => {
    const totalHT = lignes.reduce((s, l) => s + (l.prixTotalHT || 0), 0);
    const totalAvecRemise = totalHT - (totalHT * (entete.tauxRemise || 0)) / 100 + (Number(entete.mainDoeuvre) || 0);
    const totalTVA = (totalAvecRemise * (entete.taux || 0)) / 100;
    return { totalHT, totalAvecRemise, totalTVA, totalTTC: totalAvecRemise + totalTVA };
  }, [lignes, entete]);

  const enregistrer = async () => {
    setErreur("");
    const lignesValides = lignes.filter((l) => l.articleM || l.reference);
    if (!lignesValides.length) {
      setErreur("Saisissez au moins une ligne d'article");
      return;
    }
    setSaving(true);
    try {
      await axios.post("/api/commandes", {
        clientId: clientId || undefined,
        clientC: client?.nomPren,
        contactC: client?.telephone,
        telephone: client?.telephone,
        mail: client?.mail,
        boitePostale: client?.boitePostale,
        ...entete,
        ...totaux,
        remise: (totaux.totalHT * (entete.tauxRemise || 0)) / 100,
        lignes: lignesValides,
      });
      router.push("/dashboard/devis");
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Fiche de saisie du devis</h3>
        <Button variant="outline-secondary" onClick={() => router.push("/dashboard/devis")}>
          <i className="bi bi-arrow-left me-1"></i>Retour
        </Button>
      </div>

      {erreur && <div className="alert alert-danger">{erreur}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Choisissez le client</Form.Label>
              <Form.Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.nomPren} {c.raisonSociale ? `(${c.raisonSociale})` : ""}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Objet de la commande</Form.Label>
              <Form.Control value={entete.objetCommande}
                onChange={(e) => setEntete({ ...entete, objetCommande: e.target.value })} />
            </Col>
            <Col md={2}>
              <Form.Label>Devise</Form.Label>
              <Form.Select value={entete.deviseM} onChange={(e) => setEntete({ ...entete, deviseM: e.target.value })}>
                <option value="FCFA">FCFA</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>Validité</Form.Label>
              <Form.Control value={entete.validiteCommande}
                onChange={(e) => setEntete({ ...entete, validiteCommande: e.target.value })} />
            </Col>
            <Col md={3}>
              <Form.Label>Délai d&apos;exécution</Form.Label>
              <Form.Control value={entete.delaisExecution}
                onChange={(e) => setEntete({ ...entete, delaisExecution: e.target.value })} />
            </Col>
            <Col md={3}>
              <Form.Label>Garantie</Form.Label>
              <Form.Control value={entete.garantie}
                onChange={(e) => setEntete({ ...entete, garantie: e.target.value })} />
            </Col>
            <Col md={2}>
              <Form.Label>Main d&apos;œuvre</Form.Label>
              <Form.Control type="number" value={entete.mainDoeuvre}
                onChange={(e) => setEntete({ ...entete, mainDoeuvre: Number(e.target.value) })} />
            </Col>
            <Col md={2}>
              <Form.Label>Remise (%)</Form.Label>
              <Form.Control type="number" value={entete.tauxRemise}
                onChange={(e) => setEntete({ ...entete, tauxRemise: Number(e.target.value) })} />
            </Col>
            <Col md={2}>
              <Form.Label>TVA (%)</Form.Label>
              <Form.Control type="number" value={entete.taux}
                onChange={(e) => setEntete({ ...entete, taux: Number(e.target.value) })} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Lignes de saisie — article, quantité, montant unitaire, marges</span>
          <Button size="sm" variant="outline-primary" onClick={() => setLignes([...lignes, { ...LIGNE_VIDE }])}>
            <i className="bi bi-plus-lg"></i> Ajouter une ligne
          </Button>
        </Card.Header>
        <div className="table-responsive">
          <Table className="mb-0 align-middle" size="sm">
            <thead className="table-light">
              <tr>
                <th>Référence</th>
                <th style={{ minWidth: 200 }}>Article / Désignation</th>
                <th style={{ width: 80 }}>Qté</th>
                <th style={{ width: 120 }}>P.U.</th>
                <th style={{ width: 110 }}>Fr. transport</th>
                <th style={{ width: 90 }}>Marge %</th>
                <th style={{ width: 110 }}>Autres</th>
                <th style={{ width: 130 }} className="text-end">Total HT</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td><Form.Control size="sm" value={l.reference}
                    onChange={(e) => majLigne(i, "reference", e.target.value)} /></td>
                  <td><Form.Control size="sm" value={l.articleM}
                    onChange={(e) => majLigne(i, "articleM", e.target.value)} /></td>
                  <td><Form.Control size="sm" type="number" value={l.quantite}
                    onChange={(e) => majLigne(i, "quantite", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.prixUnitaire}
                    onChange={(e) => majLigne(i, "prixUnitaire", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.fraisTransport}
                    onChange={(e) => majLigne(i, "fraisTransport", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.tauxMarge}
                    onChange={(e) => majLigne(i, "tauxMarge", Number(e.target.value))} /></td>
                  <td><Form.Control size="sm" type="number" value={l.autreMontant}
                    onChange={(e) => majLigne(i, "autreMontant", Number(e.target.value))} /></td>
                  <td className="text-end fw-semibold">{fmtMontant(l.prixTotalHT)}</td>
                  <td>
                    {lignes.length > 1 && (
                      <Button size="sm" variant="outline-danger"
                        onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>
                        <i className="bi bi-x"></i>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Button size="lg" onClick={enregistrer} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le devis"}
              </Button>
            </Col>
            <Col md={6}>
              <Table size="sm" className="mb-0">
                <tbody>
                  <tr><td>Total HT</td><td className="text-end fw-bold">{fmtMontant(totaux.totalHT)}</td></tr>
                  <tr><td>Total avec remise + MO</td><td className="text-end">{fmtMontant(totaux.totalAvecRemise)}</td></tr>
                  <tr><td>TVA ({entete.taux}%)</td><td className="text-end">{fmtMontant(totaux.totalTVA)}</td></tr>
                  <tr className="table-primary">
                    <td className="fw-bold">Total TTC</td>
                    <td className="text-end fw-bold">{fmtMontant(totaux.totalTTC)} {entete.deviseM}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
}
