export default async function run(page, ui) {
  const out = {};
  const req = page.context().request;

  // --- login admin ---
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // --- création utilisateur commercial QA ---
  const cu = await req.post('http://localhost:3000/api/utilisateurs', {
    data: { nom: 'QA', prenom: 'Commercial', email: 'qa.commercial@novasys.local', password: 'Qa123456!', type: 'commercial' },
  });
  out.creationUser = { status: cu.status(), body: (await cu.json().catch(() => ({})))._id || (await cu.text()).slice(0, 200) };

  // --- clients & fournisseurs « d'un autre » ---
  const clients = await (await req.get('http://localhost:3000/api/clients')).json();
  const autreClient = clients.find((c) => c.creerPar && c.creerPar !== 'QA Commercial');
  const fournisseurs = await (await req.get('http://localhost:3000/api/fournisseurs')).json();
  const autreFourn = fournisseurs.find((f) => f.creerPar && f.creerPar !== 'QA Commercial');
  out.autreClient = autreClient && { id: autreClient._id, nomPren: autreClient.nomPren, creerPar: autreClient.creerPar };
  out.autreFourn = autreFourn && { id: autreFourn._id, nomPren: autreFourn.nomPren, creerPar: autreFourn.creerPar };

  // --- relogin en QA commercial ---
  await page.context().clearCookies();
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 20000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('qa.commercial@novasys.local');
  await page.locator('input[type="password"]').first().fill('Qa123456!');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  out.urlQa = page.url();
  await page.waitForTimeout(1000);

  // --- 1) liste complète + filtre UI ---
  const listQa = await (await req.get('http://localhost:3000/api/clients')).json();
  out.listeQa = { total: listQa.length, miens: listQa.filter((c) => c.estMien).length };

  // --- 2) GET détail client d'un autre → 404 ---
  if (autreClient) {
    const r = await req.get(`http://localhost:3000/api/clients/${autreClient._id}`);
    out.detailAutreAvant = r.status();
  }

  // --- 3) créer un devis QA avec ce client + fournisseur d'un autre ---
  const articles = await (await req.get('http://localhost:3000/api/articles')).json();
  const art = articles[0];
  const devis = await req.post('http://localhost:3000/api/commandes', {
    data: {
      clientId: autreClient?._id,
      clientC: autreClient?.nomPren,
      lignes: [{
        articleM: art?.designationA || 'Article QA', reference: art?.reference || 'QA-REF',
        quantite: 1, prixUnitaire: 1000, fournisseur: autreFourn?.nomPren,
        fournisseurId: autreFourn?._id,
      }],
    },
  });
  out.devisStatus = devis.status();
  const devisBody = await devis.json().catch(() => ({}));
  out.devisId = devisBody._id;

  // --- vérifications après ---
  const listApres = await (await req.get('http://localhost:3000/api/clients')).json();
  const cibleApres = listApres.find((c) => c._id === autreClient?._id);
  out.estMienApres = cibleApres?.estMien;
  out.detailAutreApres = autreClient ? (await req.get(`http://localhost:3000/api/clients/${autreClient._id}`)).status() : null;

  const fournQa = await (await req.get('http://localhost:3000/api/fournisseurs')).json();
  const autreFournQa = fournisseurs.find((f) => f.creerPar && f.creerPar !== 'QA Commercial');
  out.fournAvant = autreFournQa ? (await req.get(`http://localhost:3000/api/fournisseurs/${autreFournQa._id}`)).status() : null;
  const fApres = fournQa.find((f) => f._id === autreFourn?._id);
  out.fournEstMienApres = fApres?.estMien;
  out.fournDetailApres = autreFourn ? (await req.get(`http://localhost:3000/api/fournisseurs/${autreFourn._id}`)).status() : null;

  // --- UI : liste clients ---
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('http://localhost:3000/dashboard/clients', { waitUntil: 'networkidle' });
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(1500);
  out.uiTous = await page.locator('tbody tr').count();
  await page.screenshot({ path: '.qa/clients-tous.png' });
  await page.locator('select[aria-label="Afficher"]').selectOption('miens');
  await page.waitForTimeout(600);
  out.uiMiens = await page.locator('tbody tr').count();
  await page.screenshot({ path: '.qa/clients-miens.png' });

  await page.goto('http://localhost:3000/dashboard/fournisseurs', { waitUntil: 'networkidle' });
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.waitForTimeout(1200);
  out.uiFournTous = await page.locator('tbody tr').count();
  await page.screenshot({ path: '.qa/fournisseurs-tous.png' });
  await page.locator('select[aria-label="Afficher"]').selectOption('miens');
  await page.waitForTimeout(600);
  out.uiFournMiens = await page.locator('tbody tr').count();
  await page.screenshot({ path: '.qa/fournisseurs-miens.png' });

  return out;
}
