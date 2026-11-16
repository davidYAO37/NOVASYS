"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Col, Form, Modal, Row, Table } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import dayjs from "dayjs";
import { fmtDate, fmtMontant, STATUTS_COMMANDE } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/**
 * GESTION DES COMMANDES (FEN_GESTION_DES_DEVIS) : liste des commandes de
 * la période, création, actualisation, transfert au service achat,
 * annulation du transfert, proforma et documents joints.
 */
function GestionDevis() {
  const router = useRouter();
  const params = useSearchParams();
  const [commandes, setCommandes] = useState<any[]>([]);
  const [du, setDu] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [au, setAu] = useState(dayjs().format("YYYY-MM-DD"));
  const [statut, setStatut] = useState(params.get("statut") || "");
  const [showDocs, setShowDocs] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [docCommande, setDocCommande] = useState<any>(null);
  const [upload, setUpload] = useState({ libeleDocument: "", fichier: null as File | null });
  const [me, setMe] = useState<any>(null);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [docVu, setDocVu] = useState<any>(null);
  const extDoc = (docVu?.extensionF || "").toLowerCase();

  const charger = useCallback(() => {
    axios.get("/api/commandes", {
      params: { du, au, statut: statut || undefined },
    }).then((r) => setCommandes(r.data)).catch(() => {});
  }, [du, au, statut]);

  useEffect(() => {
    charger();
    axios.get("/api/me").then((r) => setMe(r.data?.user)).catch(() => {});
  }, [charger]);

  const transferer = async (id: string) => {
    if (!confirm("Transférer cette commande au service achat ?")) return;
    try {
      await axios.post(`/api/commandes/${id}/transfert`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Transfert impossible");
    }
  };

  const annulerTransfert = async (id: string) => {
    if (!confirm("Annuler le transfert de cette commande ?")) return;
    try {
      await axios.delete(`/api/commandes/${id}/transfert`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Action impossible (permission requise)");
    }
  };

  const ouvrirDocs = async (c: any) => {
    const r = await axios.get("/api/documents", { params: { commandeId: c._id } });
    setDocs(r.data);
    setDocCommande(c);
    setShowDocs(true);
  };

  const envoyerDoc = async () => {
    if (!upload.fichier || !upload.libeleDocument) {
      alert("Libellé et fichier requis");
      return;
    }
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(upload.fichier!);
    });
    await axios.post("/api/documents", {
      libeleDocument: upload.libeleDocument,
      document: base64,
      extensionF: upload.fichier.name.split(".").pop(),
      commandeId: docCommande._id,
      numCommande: docCommande.numCommande,
      numComm: docCommande.numComm,
    });
    setUpload({ libeleDocument: "", fichier: null });
    ouvrirDocs(docCommande);
  };

  const peutAnnulerTransfert =
    me?.type === "admin" || me?.type === "adminsuper" ||
    me?.permissions?.actions?.includes("annulation_transfert") ||
    me?.permissions?.actions?.includes("*");

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Gestion des commandes</h3>
        <Button onClick={() => router.push("/dashboard/devis/nouveau")}>
          <i className="bi bi-plus-lg me-1"></i>Nouvelle commande
        </Button>
      </div>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col xs={12} sm={6} md={3}>
              <Form.Label>Du</Form.Label>
              <Form.Control type="date" value={du} onChange={(e) => setDu(e.target.value)} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Label>Au</Form.Label>
              <Form.Control type="date" value={au} onChange={(e) => setAu(e.target.value)} />
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Label>Statut</Form.Label>
              <Form.Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(STATUTS_COMMANDE).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Form.Select>
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
              <th>N° Commande</th>
              <th>N° Proforma</th>
              <th>Date</th>
              <th>Client</th>
              <th>Objet</th>
              <th className="text-end">Total TTC</th>
              <th>Statut</th>
              <th>Service achat</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((c) => (
              <tr key={c._id}>
                <td className="fw-semibold">{c.numCommande}</td>
                <td>{c.numComm}</td>
                <td>{fmtDate(c.dateCommande)}</td>
                <td>{c.clientC}</td>
                <td>{c.objetCommande}</td>
                <td className="text-end">{fmtMontant(c.totalTTC)}</td>
                <td>
                  <Badge bg={STATUTS_COMMANDE[c.statutC]?.color || "secondary"} className="badge-statut">
                    {STATUTS_COMMANDE[c.statutC]?.label || c.statutC}
                  </Badge>
                </td>
                <td>
                  {c.serviceAchat
                    ? <Badge bg="info">Transférée</Badge>
                    : c.renvoyee
                      ? (
                        <>
                          <Badge bg="danger">Renvoyée par le service achat</Badge>
                          <div className="small text-muted">
                            {c.motifRenvoi}
                            {c.renvoyePar && <> — par {c.renvoyePar} le {fmtDate(c.renvoyeLe)}</>}
                          </div>
                        </>
                      )
                      : <Badge bg="secondary">Pas encore envoyée</Badge>}
                </td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Proforma"
                    onClick={() => setApercuId(c._id)}>
                    <i className="bi bi-file-earmark-pdf"></i>
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-1" title="Détail / Actualiser"
                    onClick={() => router.push(`/dashboard/devis/${c._id}`)}>
                    <i className="bi bi-pencil-square"></i>
                  </Button>
                  <Button size="sm" variant="outline-info" className="me-1" title="Documents joints"
                    onClick={() => ouvrirDocs(c)}>
                    <i className="bi bi-paperclip"></i>
                  </Button>
                  {!c.serviceAchat && (
                    <Button size="sm" variant="outline-success" className="me-1" title="Transférer au service achat"
                      onClick={() => transferer(c._id)}>
                      <i className="bi bi-send"></i>
                    </Button>
                  )}
                  {c.serviceAchat && c.statutC === "en_cours" && peutAnnulerTransfert && (
                    <Button size="sm" variant="outline-danger" title="Annuler le transfert"
                      onClick={() => annulerTransfert(c._id)}>
                      <i className="bi bi-arrow-counterclockwise"></i>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!commandes.length && (
              <tr><td colSpan={9} className="text-center text-muted py-4">Aucune commande sur la période</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Documents joints */}
      <Modal show={showDocs} onHide={() => setShowDocs(false)} size="lg" fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Documents — {docCommande?.numCommande}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-2 align-items-end mb-3">
            <Col xs={12} sm={6} md={5}>
              <Form.Label>Libellé du document</Form.Label>
              <Form.Control value={upload.libeleDocument}
                onChange={(e) => setUpload({ ...upload, libeleDocument: e.target.value })} />
            </Col>
            <Col xs={12} sm={6} md={5}>
              <Form.Label>Fichier</Form.Label>
              <Form.Control type="file"
                onChange={(e) => setUpload({ ...upload, fichier: (e.target as HTMLInputElement).files?.[0] || null })} />
            </Col>
            <Col xs={12} sm={12} md={2}>
              <Button className="w-100" onClick={envoyerDoc}>Ajouter</Button>
            </Col>
          </Row>
          <Table responsive size="sm" hover>
            <thead><tr><th>Libellé</th><th>Type</th><th>Date</th><th>Ajouté par</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id}>
                  <td>{d.libeleDocument}</td>
                  <td>{d.extensionF}</td>
                  <td>{fmtDate(d.date)}</td>
                  <td>{d.ajouterPar}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" className="me-1" title="Afficher"
                      onClick={() => setDocVu(d)}>
                      <i className="bi bi-eye"></i>
                    </Button>
                    <Button size="sm" variant="outline-secondary" title="Télécharger"
                      href={`/api/documents/${d._id}?download=1`}>
                      <i className="bi bi-download"></i>
                    </Button>
                  </td>
                </tr>
              ))}
              {!docs.length && <tr><td colSpan={5} className="text-center text-muted">Aucun document</td></tr>}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={!!docVu} onHide={() => setDocVu(null)} size="xl" centered fullscreen="md-down">
        <Modal.Header closeButton>
          <Modal.Title>Document — {docVu?.libeleDocument}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 bg-light text-center" style={{ height: "75vh" }}>
          {docVu && (["jpg", "jpeg", "png", "gif", "webp"].includes(extDoc) ? (
            <img src={`/api/documents/${docVu._id}`} alt={docVu.libeleDocument}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : ["pdf", "txt"].includes(extDoc) ? (
            <iframe src={`/api/documents/${docVu._id}`} title={docVu.libeleDocument}
              style={{ width: "100%", height: "100%", border: 0 }} />
          ) : (
            <div className="p-5 text-muted">
              Aperçu indisponible pour les fichiers « .{extDoc || "?"} ». Utilisez « Télécharger ».
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" href={docVu ? `/api/documents/${docVu._id}?download=1` : undefined}>
            <i className="bi bi-download me-1"></i>Télécharger
          </Button>
          <Button variant="secondary" onClick={() => setDocVu(null)}>Fermer</Button>
        </Modal.Footer>
      </Modal>

      <PdfPreviewModal type="proforma" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}

export default function GestionDevisPage() {
  return (
    <Suspense fallback={<div className="text-center p-5">Chargement...</div>}>
      <GestionDevis />
    </Suspense>
  );
}
