"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonGroup, Modal, Spinner } from "react-bootstrap";
import type { PdfType } from "@/components/print/PdfButtons";

const TITRES: Record<PdfType, string> = {
  facture: "Facture",
  bl: "Bon de livraison",
  proforma: "Proforma",
  "bon-commande": "Bon de commande",
  recu: "Reçu",
};

/**
 * Aperçu PDF intégré (équivalent de l'aperçu avant impression des états
 * WinDev) : bascule avec / sans entête, impression et téléchargement,
 * sans quitter la page en cours.
 */
export default function PdfPreviewModal({
  type,
  id,
  show,
  onHide,
  avecEnteteInitial = true,
}: {
  type: PdfType;
  id: string | null;
  show: boolean;
  onHide: () => void;
  avecEnteteInitial?: boolean;
}) {
  const [avecEntete, setAvecEntete] = useState(avecEnteteInitial);
  const [loading, setLoading] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (show) setAvecEntete(avecEnteteInitial);
  }, [show, avecEnteteInitial]);

  useEffect(() => {
    setLoading(true);
  }, [id, avecEntete]);

  if (!id) return null;
  const src = `/api/pdf/${type}/${id}?avecEntete=${avecEntete}`;

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="md-down" dialogClassName="modal-apercu-pdf">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">Aperçu — {TITRES[type]}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 position-relative pdf-preview-body">
        {loading && (
          <div className="position-absolute top-50 start-50 translate-middle">
            <Spinner animation="border" />
          </div>
        )}
        <iframe
          ref={frame}
          key={src}
          src={src}
          title={`Aperçu ${TITRES[type]}`}
          onLoad={() => setLoading(false)}
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </Modal.Body>
      <Modal.Footer className="justify-content-between">
        <ButtonGroup size="sm">
          <Button variant={avecEntete ? "primary" : "outline-primary"} onClick={() => setAvecEntete(true)}>
            Avec entête
          </Button>
          <Button variant={!avecEntete ? "primary" : "outline-primary"} onClick={() => setAvecEntete(false)}>
            Sans entête
          </Button>
        </ButtonGroup>
        <div className="d-flex gap-2">
          <Button size="sm" variant="success" onClick={() => frame.current?.contentWindow?.print()}>
            <i className="bi bi-printer me-1"></i>Imprimer
          </Button>
          <Button size="sm" variant="outline-secondary" as="a" href={src} download={`${type}-${id}.pdf`}>
            <i className="bi bi-download me-1"></i>Télécharger
          </Button>
          <Button size="sm" variant="secondary" onClick={onHide}>Fermer</Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
