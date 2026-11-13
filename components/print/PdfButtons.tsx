"use client";

import { useState } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

export type PdfType = "facture" | "bl" | "proforma" | "bon-commande" | "recu";

/**
 * Boutons « avec entête » / « sans entête » — même principe que les
 * boutons d'impression easy_medical. Le PDF (généré côté serveur avec le
 * logo, l'entête et le pied de page de la fiche Entreprise) s'affiche dans
 * un aperçu intégré, sans ouvrir de nouvel onglet.
 */
export default function PdfButtons({
  type,
  id,
  size = "sm",
  label,
}: {
  type: PdfType;
  id: string;
  size?: "sm" | "lg";
  label?: string;
}) {
  const [apercu, setApercu] = useState<boolean | null>(null);

  return (
    <>
      <ButtonGroup size={size}>
        <Button variant="outline-success" title="Aperçu avec entête" onClick={() => setApercu(true)}>
          <i className="bi bi-file-earmark-pdf me-1"></i>
          {label ? `${label} — avec entête` : "Avec entête"}
        </Button>
        <Button variant="outline-secondary" title="Aperçu sans entête" onClick={() => setApercu(false)}>
          <i className="bi bi-file-earmark me-1"></i>
          Sans entête
        </Button>
      </ButtonGroup>
      <PdfPreviewModal
        type={type}
        id={id}
        show={apercu !== null}
        avecEnteteInitial={apercu ?? true}
        onHide={() => setApercu(null)}
      />
    </>
  );
}
