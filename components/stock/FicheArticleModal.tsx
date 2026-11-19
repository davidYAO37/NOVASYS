"use client";

import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import axios from "axios";

type Props = {
  show: boolean;
  onHide: () => void;
  onSaved: (doc: any) => void;
};

/**
 * Création rapide d'un article depuis le sélecteur du devis : seule la
 * désignation est saisie, la référence est générée par l'API (ART-AAAA-NNNN).
 */
export default function FicheArticleModal({ show, onHide, onSaved }: Props) {
  const [designation, setDesignation] = useState("");
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (show) {
      setDesignation("");
      setErreur("");
    }
  }, [show]);

  const enregistrer = async () => {
    if (!designation.trim()) {
      setErreur("La désignation est obligatoire");
      return;
    }
    setSaving(true);
    setErreur("");
    try {
      const r = await axios.post("/api/articles", { designationA: designation.trim() });
      onSaved(r.data);
      onHide();
    } catch (e: any) {
      setErreur(e.response?.data?.message || "Erreur d'enregistrement");
    }
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Nouvel article</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {erreur && <div className="alert alert-danger">{erreur}</div>}
        <Form.Label>Désignation *</Form.Label>
        <Form.Control autoFocus value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") enregistrer(); }} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Annuler</Button>
        <Button onClick={enregistrer} disabled={saving}>
          {saving ? "Enregistrement..." : "Valider"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
