"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Table } from "react-bootstrap";
import axios from "axios";
import { fmtDate } from "@/lib/format";

/** FI_Alerte_Stock : articles dont la quantité est sous le seuil d'alerte. */
export default function AlertesStockPage() {
  const [alertes, setAlertes] = useState<any[]>([]);

  useEffect(() => {
    axios.get("/api/stock", { params: { alertes: "1" } })
      .then((r) => setAlertes(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h3 className="mb-3 titre-page">
        <i className="bi bi-exclamation-triangle text-warning me-2"></i>
        Alertes stock
      </h3>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>Référence</th><th>Désignation</th>
              <th className="text-end">Quantité en stock</th>
              <th className="text-end">Seuil d&apos;alerte</th>
              <th>Dernière modification</th><th>Par</th>
            </tr>
          </thead>
          <tbody>
            {alertes.map((s) => (
              <tr key={s._id}>
                <td className="fw-semibold">{s.reference}</td>
                <td>{s.designation}</td>
                <td className="text-end"><Badge bg="danger">{s.qteEnStock}</Badge></td>
                <td className="text-end">{s.seuilAlerte}</td>
                <td>{fmtDate(s.dateModif)}</td>
                <td>{s.auteurModif}</td>
              </tr>
            ))}
            {!alertes.length && (
              <tr><td colSpan={6} className="text-center text-muted py-4">Aucune alerte — tout le stock est au-dessus des seuils</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
