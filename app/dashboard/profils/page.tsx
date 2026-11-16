"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Modal, Table } from "react-bootstrap";
import axios from "axios";

/** FEN_Table_Profil + FEN_Fiche_Profil : gestion des profils utilisateurs. */
export default function ProfilsPage() {
  const [profils, setProfils] = useState<any[]>([]);
  const [showFiche, setShowFiche] = useState(false);
  const [fiche, setFiche] = useState({ profil: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(() => {
    axios.get("/api/profils").then((r) => setProfils(r.data)).catch(() => {});
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async () => {
    setMessage("");
    try {
      if (editId) await axios.put(`/api/profils/${editId}`, fiche);
      else await axios.post("/api/profils", fiche);
      setShowFiche(false);
      charger();
    } catch (e: any) {
      setMessage(e.response?.data?.message || "Erreur");
    }
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer ce profil ?")) return;
    try {
      await axios.delete(`/api/profils/${id}`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Suppression impossible");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 titre-page">Profils utilisateurs</h3>
        <Button onClick={() => { setEditId(null); setFiche({ profil: "" }); setShowFiche(true); }}>
          <i className="bi bi-plus-lg me-1"></i>Nouveau profil
        </Button>
      </div>

      {message && <div className="alert alert-danger">{message}</div>}

      <Card className="shadow-sm" style={{ maxWidth: 600 }}>
        <Table responsive hover className="table-novasys mb-0">
          <thead><tr><th>Profil</th><th style={{ width: 120 }}>Actions</th></tr></thead>
          <tbody>
            {profils.map((p) => (
              <tr key={p._id}>
                <td className="fw-semibold">{p.profil}</td>
                <td>
                  <Button size="sm" variant="outline-secondary" className="me-1"
                    onClick={() => { setEditId(p._id); setFiche({ profil: p.profil }); setShowFiche(true); }}>
                    <i className="bi bi-pencil"></i>
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => supprimer(p._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {!profils.length && (
              <tr><td colSpan={2} className="text-center text-muted py-4">Aucun profil</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Modal show={showFiche} onHide={() => setShowFiche(false)}>
        <Modal.Header closeButton><Modal.Title>Fiche profil</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Label>Nom du profil *</Form.Label>
          <Form.Control value={fiche.profil} onChange={(e) => setFiche({ profil: e.target.value })} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFiche(false)}>Annuler</Button>
          <Button onClick={enregistrer}>Valider</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
