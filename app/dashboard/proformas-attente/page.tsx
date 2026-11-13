"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Table } from "react-bootstrap";
import { useRouter } from "next/navigation";
import axios from "axios";
import { fmtDate, fmtMontant } from "@/lib/format";
import PdfPreviewModal from "@/components/print/PdfPreviewModal";

/** FI_proforma_en_attente : devis pas encore transférés au service achat. */
export default function ProformasAttentePage() {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const router = useRouter();

  const charger = () => {
    axios.get("/api/commandes", { params: { enAttente: "1" } })
      .then((r) => setCommandes(r.data)).catch(() => {});
  };

  useEffect(() => { charger(); }, []);

  const transferer = async (id: string) => {
    try {
      await axios.post(`/api/commandes/${id}/transfert`);
      charger();
    } catch (e: any) {
      alert(e.response?.data?.message || "Transfert impossible");
    }
  };

  return (
    <div>
      <h3 className="mb-3">Proformas en attente</h3>
      <p className="text-muted">Commandes pas encore envoyées au service achat.</p>

      <Card className="shadow-sm">
        <Table responsive hover className="table-novasys mb-0">
          <thead>
            <tr>
              <th>N° Commande</th><th>Date</th><th>Client</th><th>Objet</th>
              <th className="text-end">Total TTC</th><th>Saisie par</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {commandes.map((c) => (
              <tr key={c._id}>
                <td className="fw-semibold">{c.numCommande}</td>
                <td>{fmtDate(c.dateCommande)}</td>
                <td>{c.clientC}</td>
                <td>{c.objetCommande}</td>
                <td className="text-end">{fmtMontant(c.totalTTC)}</td>
                <td>{c.saisiePar}</td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-primary" className="me-1" title="Proforma"
                    onClick={() => setApercuId(c._id)}>
                    <i className="bi bi-file-earmark-pdf"></i>
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-1"
                    onClick={() => router.push(`/dashboard/devis/${c._id}`)}>
                    <i className="bi bi-pencil-square"></i>
                  </Button>
                  <Button size="sm" variant="outline-success" onClick={() => transferer(c._id)}>
                    <i className="bi bi-send me-1"></i>Transférer
                  </Button>
                </td>
              </tr>
            ))}
            {!commandes.length && (
              <tr><td colSpan={7} className="text-center text-muted py-4">
                Aucune proforma en attente — toutes les commandes ont été transférées
              </td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <PdfPreviewModal type="proforma" id={apercuId} show={!!apercuId} onHide={() => setApercuId(null)} />
    </div>
  );
}
