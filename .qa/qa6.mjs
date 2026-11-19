import fs from "node:fs";
export default async function run(page) {
  const out = {};
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});

  await page.goto('http://localhost:3000/dashboard/service-achat', { waitUntil: 'networkidle' });
  await page.waitForSelector('table', { timeout: 30000 });
  await page.waitForTimeout(1200);

  const btn = page.locator('button:has-text("Bons de commande")').first();
  if (!(await btn.count())) { out.note = "Aucun devis en cours/partielle avec lignes restantes"; return out; }
  await btn.click();
  await page.waitForSelector('.modal.show', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '.qa/bc-modal-avant.png' });

  // 1. créer le transitaire QA Transit via +
  await page.locator('.modal.show button[title="Ajouter un transitaire"]').click();
  await page.waitForSelector('.modal.show input', { timeout: 8000 });
  const modals = page.locator('.modal.show');
  const transModal = modals.last();
  await transModal.locator('input').first().fill('QA Transit');
  await transModal.locator('button:has-text("Valider")').click();
  await page.waitForTimeout(1200);
  out.transitaireSelect = await page.locator('.modal.show').first().locator('select').last().inputValue().catch(() => null);

  // 2. fournisseur + extras + cocher une ligne
  const modal = page.locator('.modal.show').first();
  await modal.locator('select').first().selectOption({ index: 1 }); // premier fournisseur
  const inputs = modal.locator('input[type="number"]');
  // ordre : TVA, Transport, Autre, Douane
  await modal.locator('label:has-text("Transport") + * input, input').nth(0); // noop
  const bloc = await page.evaluate(() => {
    const m = document.querySelectorAll('.modal.show')[0];
    const labels = [...m.querySelectorAll('label')].map(l => l.textContent);
    return labels;
  });
  out.labels = bloc;
  // remplir par label voisin
  const fillByLabel = async (label, val) => {
    await page.evaluate(([lab, v]) => {
      const m = document.querySelectorAll('.modal.show')[0];
      const l = [...m.querySelectorAll('label')].find(x => x.textContent.includes(lab));
      const inp = l.parentElement.querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, v);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }, [label, val]);
  };
  await fillByLabel('Transport (FCFA)', '50000');
  await fillByLabel('Autre montant', '20000');
  await fillByLabel('Douane (%)', '10');
  await page.waitForTimeout(300);
  // cocher la 1re ligne disponible
  await modal.locator('tbody input[type="checkbox"]:not([disabled])').first().check();
  await page.waitForTimeout(500);
  out.totauxAffiches = await page.evaluate(() => {
    const m = document.querySelectorAll('.modal.show')[0];
    return m.querySelector('.text-end').innerText;
  });
  await page.screenshot({ path: '.qa/bc-modal-totaux.png' });

  // 3. valider le bon
  await page.locator('.modal.show .modal-footer button:has-text("Valider le bon")').click();
  await page.waitForTimeout(2500);
  out.messageApres = await page.evaluate(() => document.querySelector('.modal.show .alert')?.textContent || null);
  await page.screenshot({ path: '.qa/bc-modal-apres.png' });

  // 4. retrouver le bon créé + PDF
  const req = page.context().request;
  const achats = await (await req.get('http://localhost:3000/api/achats')).json();
  const a = achats[0];
  out.achat = a && { id: a._id, numAchat: a.numAchat, transitaire: a.transitaire, sousTotalHT: a.sousTotalHT, fraisTransport: a.fraisTransport, autreMontant: a.autreMontant, tauxDouane: a.tauxDouane, montantDouane: a.montantDouane, totalHT: a.totalHT, totalTVA: a.totalTVA, totalTTC: a.totalTTC, resteAPaye: a.resteAPaye };
  const trans = await (await req.get('http://localhost:3000/api/transitaires')).json();
  out.transitaires = trans.map(t => ({ id: t._id, nom: t.nom }));
  if (a) {
    const pdf = await req.get(`http://localhost:3000/api/pdf/bon-commande/${a._id}`);
    out.pdfStatus = pdf.status();
    fs.writeFileSync('.qa/bc-extras.pdf', await pdf.body());
  }
  return out;
}
