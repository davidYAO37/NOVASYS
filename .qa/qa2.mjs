import fs from "node:fs";
export default async function run(page, ui) {
  const out = {};
  // --- login ---
  await page.goto('http://localhost:3001/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 20000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});

  // --- fiche devis ---
  await page.goto('http://localhost:3001/dashboard/devis/nouveau', { waitUntil: 'networkidle' });
  await page.waitForSelector('.grille-devis table', { timeout: 20000 });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.waitForTimeout(1500);

  out.w1366 = await page.evaluate(() => ({
    noPageHScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  }));

  const ligne = page.locator('.grille-devis tbody tr').first();
  const nums = ligne.locator('input[type="number"]');
  await nums.nth(1).fill('100');
  await nums.nth(2).fill('655');
  await nums.nth(3).fill('20');
  await nums.nth(4).fill('10');
  await ligne.locator('textarea').fill('Première ligne de description\nDeuxième ligne');
  await page.waitForTimeout(400);
  out.puHT = (await ligne.locator('td.col-resultat').first().innerText()).trim();

  // --- + article : création QA-ART-01 ---
  await ligne.locator('button[title="Nouvel article"]').click();
  await page.waitForSelector('.modal.show input', { timeout: 10000 });
  const modal = page.locator('.modal.show');
  await modal.locator('input').nth(0).fill('QA-ART-01');
  await modal.locator('input').nth(1).fill('Article test QA');
  await modal.locator('button:has-text("Valider")').click();
  await page.waitForSelector('.modal.show', { state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  out.articleSelectValue = await ligne.locator('select').first().inputValue();
  out.reference = await ligne.locator('td').nth(2).locator('input').inputValue();
  await page.screenshot({ path: '.qa/devis2-saisie.png' });

  // --- enregistrement ---
  await page.locator('button:has-text("Valider la Commande")').click();
  await page.waitForURL(/dashboard\/devis$/, { timeout: 20000 }).catch(() => {});
  out.urlAfterSave = page.url();

  // retrouver le devis créé
  const devis = await page.evaluate(async () => {
    const r = await fetch('/api/commandes?enAttente=1', { credentials: 'include' });
    const arr = await r.json();
    return arr.find((c) => (c.lignes || []).length === undefined) , arr;
  }).catch(() => null);
  // plus simple : détail via liste triée par date — prendre le premier
  const id = await page.evaluate(async () => {
    const r = await fetch('/api/commandes?enAttente=1', { credentials: 'include' });
    const arr = await r.json();
    return arr[0]?._id;
  });
  out.commandeId = id;
  const detail = await page.evaluate(async (id) => {
    const r = await fetch('/api/commandes/' + id, { credentials: 'include' });
    return r.json();
  }, id);
  out.lignePersistee = detail.lignes?.[0] ? {
    articleId: detail.lignes[0].articleId, articleM: detail.lignes[0].articleM,
    reference: detail.lignes[0].reference, description: detail.lignes[0].description,
    prixUnitaireHT: detail.lignes[0].prixUnitaireHT,
  } : null;

  // --- réouverture ---
  await page.goto('http://localhost:3001/dashboard/devis/' + id, { waitUntil: 'networkidle' });
  await page.waitForSelector('.grille-devis table', { timeout: 20000 });
  await page.waitForTimeout(1000);
  const ligne2 = page.locator('.grille-devis tbody tr').first();
  out.articleIdRouvert = await ligne2.locator('select').first().inputValue();
  out.descRouvert = await ligne2.locator('textarea').inputValue();
  await page.screenshot({ path: '.qa/devis2-rouvert.png' });

  // --- PDF proforma ---
  const pdf = await page.context().request.get('http://localhost:3001/api/pdf/proforma/' + id);
  out.pdfStatus = pdf.status();
  const buf = await pdf.body();
  fs.writeFileSync('.qa/proforma-qa.pdf', buf);

  out.articleId = out.articleSelectValue;
  return out;
}
