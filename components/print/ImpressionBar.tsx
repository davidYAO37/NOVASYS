"use client";

import { Button, ButtonGroup } from "react-bootstrap";
import PdfButtons, { PdfType } from "@/components/print/PdfButtons";

/**
 * Barre d'impression commune : impression navigateur avec / sans entête
 * + PDF serveur avec / sans entête (comportement easy_medical).
 */
export default function ImpressionBar({
  pdfType,
  id,
  onPrint,
  libelle,
}: {
  pdfType: PdfType;
  id: string;
  onPrint: (avecEntete: boolean) => void;
  libelle?: string;
}) {
  return (
    <div className="no-print mb-3 d-flex flex-wrap gap-2 align-items-center">
      {libelle && <strong className="me-2">{libelle}</strong>}
      <ButtonGroup size="sm">
        <Button variant="primary" onClick={() => onPrint(true)}>
          <i className="bi bi-printer me-1"></i>Imprimer avec entête
        </Button>
        <Button variant="outline-primary" onClick={() => onPrint(false)}>
          <i className="bi bi-printer me-1"></i>Sans entête
        </Button>
      </ButtonGroup>
      <span className="text-muted small ms-2">PDF :</span>
      <PdfButtons type={pdfType} id={id} />
    </div>
  );
}
