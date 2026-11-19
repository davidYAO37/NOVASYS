import fs from "node:fs";
export default async function run(page) {
  const out = {};
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});

  // trouver un fournisseur avec des achats (détail → achats non vides)
  const req = page.context().request;
  const fourns = await (await req.get('http://localhost:3000/api/fournisseurs')).json();
  let fourn = null;
  for (const f of fourns) {
    const d = await (await req.get('http://localhost:3000/api/fournisseurs/' + f._id)).json();
    if ((d.achats || []).length) { fourn = { id: f._id, nom: f.nomPren, achatId: d.achats[0]._id, numAchat: d.achats[0].numAchat }; break; }
  }
  out.fournisseur = fourn;
  if (!fourn) return out;

  // vérif PDF statut
  const pdf = await req.get(`http://localhost:3000/api/pdf/bon-commande/${fourn.achatId}`);
  out.pdfStatus = pdf.status();
  const buf = await pdf.body();
  fs.writeFileSync('.qa/bc-bon.pdf', buf);

  for (const [w, h, tag] of [[1366, 768, '1366'], [1920, 1080, '1920']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('http://localhost:3000/dashboard/fournisseurs', { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    await page.waitForTimeout(800);
    // ligne du fournisseur
    const row = page.locator('tbody tr', { hasText: fourn.nom }).first();
    await row.locator('button').first().click(); // œil (Commandes)
    await page.waitForSelector('.modal.show', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.locator('.modal.show button:has-text("Bon de commande")').first().click();
    await page.waitForSelector('.modal-apercu-pdf iframe', { timeout: 10000 });
    await page.waitForTimeout(2500);
    out[tag] = await page.evaluate(() => {
      const apercu = document.querySelector('.modal-apercu-pdf')?.closest('.modal');
      const modals = [...document.querySelectorAll('.modal.show')].map((m) => ({
        cls: (m.className || '').slice(0, 60), z: getComputedStyle(m).zIndex,
        hasApercu: !!m.querySelector('.modal-apercu-pdf'),
      }));
      const backdrops = [...document.querySelectorAll('.modal-backdrop')].map((b) => ({
        z: getComputedStyle(b).zIndex, show: b.classList.contains('show'),
      }));
      const mc = document.querySelector('.modal-apercu-pdf .modal-content')?.getBoundingClientRect();
      const fr = document.querySelector('.modal-apercu-pdf iframe')?.getBoundingClientRect();
      // élément réellement au point centre de l'iframe
      const cx = fr ? fr.left + fr.width / 2 : 0, cy = fr ? fr.top + 40 : 0;
      const top = document.elementFromPoint(cx, cy);
      return { modals, backdrops, modalContent: mc && { w: Math.round(mc.width), h: Math.round(mc.height) },
        iframe: fr && { w: Math.round(fr.width), h: Math.round(fr.height), pctH: Math.round(fr.height / innerHeight * 100) },
        elementAuCentre: top && { tag: top.tagName, cls: (top.className || '').toString().slice(0, 60) },
        bodyModalOpen: document.body.classList.contains('modal-open'),
        bodyOverflow: getComputedStyle(document.body).overflow };
    });
    await page.screenshot({ path: `.qa/bc-${tag}-apercu.png` });
    // fermer l'aperçu → modale détail utilisable ?
    await page.locator('.modal-apercu-pdf button:has-text("Fermer")').first().click();
    await page.waitForTimeout(700);
    out[tag].apresFermeture = await page.evaluate(() => ({
      detailVisible: !!document.querySelector('.modal.show'),
      detailScrollable: (() => { const b = document.querySelector('.modal.show .modal-body'); return b ? b.scrollHeight >= 0 : null; })(),
      bodyModalOpen: document.body.classList.contains('modal-open'),
    }));
    await page.screenshot({ path: `.qa/bc-${tag}-detail.png` });
    // fermer la modale détail
    await page.locator('.modal.show .btn-close, .modal.show button:has-text("Fermer")').first().click();
    await page.waitForTimeout(700);
    out[tag].apresToutFerme = await page.evaluate(() => ({
      modalsRestantes: document.querySelectorAll('.modal.show').length,
      bodyModalOpen: document.body.classList.contains('modal-open'),
      bodyOverflow: getComputedStyle(document.body).overflow,
    }));
  }
  return out;
}
