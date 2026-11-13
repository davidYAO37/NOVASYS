"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row } from "react-bootstrap";
import axios from "axios";
import { EnteteEntreprise } from "@/components/print/DocumentPrint";

const MAX_IMAGE_KB = 500;

/**
 * FEN_entreprise / FEN_Fiche_Entreprise : fiche de la société.
 * Le logo, l'entête, le cachet et le pied de page sont repris sur toutes
 * les impressions (facture, BL, proforma, bon de commande, reçu) lorsque
 * l'option « avec entête » est choisie.
 */
export default function EntreprisePage() {
  const [e, setE] = useState<any>({});
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/entreprise").then((r) => setE(r.data || {})).catch(() => {});
  }, []);

  const enregistrer = async () => {
    if (!e.nomSociete?.trim()) {
      setMessage({ type: "danger", text: "Le nom de la société est obligatoire" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const r = await axios.put("/api/entreprise", e);
      setE(r.data);
      setMessage({ type: "success", text: "Informations enregistrées" });
    } catch (err: any) {
      setMessage({ type: "danger", text: err.response?.data?.message || "Erreur d'enregistrement" });
    }
    setSaving(false);
  };

  const set = (k: string) => (ev: any) => setE({ ...e, [k]: ev.target.value });

  const chargerImage = (k: "logo" | "cachetDG") => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      setMessage({ type: "danger", text: "Format accepté : PNG ou JPEG" });
      return;
    }
    if (file.size > MAX_IMAGE_KB * 1024) {
      setMessage({ type: "danger", text: `Image trop lourde (max ${MAX_IMAGE_KB} Ko)` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setE((prev: any) => ({ ...prev, [k]: reader.result as string }));
    reader.readAsDataURL(file);
    ev.target.value = "";
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <h3 className="mb-3">Fiche entreprise</h3>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <Card className="shadow-sm mb-3">
        <Card.Header className="fw-semibold">Informations générales</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}><Form.Label>Nom de la société *</Form.Label>
              <Form.Control value={e.nomSociete || ""} onChange={set("nomSociete")} /></Col>
            <Col md={6}><Form.Label>Activité</Form.Label>
              <Form.Control value={e.activite || ""} onChange={set("activite")} /></Col>
            <Col md={6}><Form.Label>Téléphone</Form.Label>
              <Form.Control value={e.telSociete || ""} onChange={set("telSociete")} /></Col>
            <Col md={6}><Form.Label>Fax</Form.Label>
              <Form.Control value={e.faxSociete || ""} onChange={set("faxSociete")} /></Col>
            <Col md={6}><Form.Label>Email</Form.Label>
              <Form.Control type="email" value={e.emailSociete || ""} onChange={set("emailSociete")} /></Col>
            <Col md={6}><Form.Label>Ville</Form.Label>
              <Form.Control value={e.villeSociete || ""} onChange={set("villeSociete")} /></Col>
            <Col md={6}><Form.Label>Pays</Form.Label>
              <Form.Control value={e.pays || ""} onChange={set("pays")} /></Col>
            <Col md={6}><Form.Label>NCC</Form.Label>
              <Form.Control value={e.ncc || ""} onChange={set("ncc")} /></Col>
            <Col md={12}><Form.Label>Adresse de la société</Form.Label>
              <Form.Control value={e.adresseSociete || ""} onChange={set("adresseSociete")} /></Col>
            <Col md={12}><Form.Label>Situation géographique</Form.Label>
              <Form.Control value={e.situationGeo || ""} onChange={set("situationGeo")} /></Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm mb-3">
        <Card.Header className="fw-semibold">Paramètres d'impression (entête / pied de page)</Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Logo (PNG/JPEG, max {MAX_IMAGE_KB} Ko)</Form.Label>
              <Form.Control type="file" accept="image/png,image/jpeg" onChange={chargerImage("logo")} />
              {e.logo && (
                <div className="mt-2 d-flex align-items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.logo} alt="Logo" style={{ maxHeight: 70, maxWidth: 140, objectFit: "contain" }} className="border rounded p-1" />
                  <Button size="sm" variant="outline-danger" onClick={() => setE({ ...e, logo: "" })}>Retirer</Button>
                </div>
              )}
            </Col>
            <Col md={6}>
              <Form.Label>Cachet / signature DG (PNG/JPEG)</Form.Label>
              <Form.Control type="file" accept="image/png,image/jpeg" onChange={chargerImage("cachetDG")} />
              {e.cachetDG && (
                <div className="mt-2 d-flex align-items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.cachetDG} alt="Cachet" style={{ maxHeight: 70, maxWidth: 140, objectFit: "contain" }} className="border rounded p-1" />
                  <Button size="sm" variant="outline-danger" onClick={() => setE({ ...e, cachetDG: "" })}>Retirer</Button>
                </div>
              )}
            </Col>
            <Col md={6}>
              <Form.Label>Position du logo</Form.Label>
              <Form.Select value={e.logoPosition || "gauche"} onChange={set("logoPosition")}>
                <option value="gauche">À gauche du texte</option>
                <option value="droite">À droite du texte</option>
                <option value="centre">Centré au-dessus du texte</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Alignement du texte de l'entête</Form.Label>
              <Form.Select value={e.enteteAlignement || "gauche"} onChange={set("enteteAlignement")}>
                <option value="gauche">Aligné à gauche</option>
                <option value="centre">Centré</option>
                <option value="droite">Aligné à droite</option>
              </Form.Select>
            </Col>
            <Col md={12}>
              <Form.Label>Entête (texte sous le nom — une information par ligne)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={e.enteteSociete || ""}
                onChange={set("enteteSociete")}
                placeholder={"Ex. :\nSARL au capital de 10 000 000 FCFA — RCCM CI-ABJ-...\nCocody, Abidjan — Tél : 27 22 ... — contact@..."}
              />
              <Form.Text>Laisser vide pour utiliser automatiquement adresse, téléphone, email et NCC.</Form.Text>
            </Col>
            <Col md={12}>
              <Form.Label>Pied de page</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={e.piedDePage || ""}
                onChange={set("piedDePage")}
                placeholder="Ex. : Compte bancaire SGBCI n° ... — Merci de votre confiance"
              />
            </Col>
          </Row>

          <div className="mt-4">
            <div className="text-muted small mb-1">Aperçu de l'entête et du pied de page sur les documents :</div>
            <div className="border rounded bg-white p-3">
              <EnteteEntreprise e={{ ...e, nomSociete: e.nomSociete || "NOM DE LA SOCIÉTÉ" }} />
              <div className="text-center text-muted py-4 small">… contenu du document …</div>
              <div className="text-center text-muted small border-top pt-2" style={{ whiteSpace: "pre-line" }}>
                {e.piedDePage || "Merci de votre confiance"}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Button size="lg" onClick={enregistrer} disabled={saving}>
        {saving ? "Enregistrement..." : "Valider"}
      </Button>
    </div>
  );
}
