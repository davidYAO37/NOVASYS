export default async function run(page) {
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('qa.commercial@novasys.local');
  await page.locator('input[type="password"]').first().fill('Qa123456!');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  const req = page.context().request;
  const fournisseurs = await (await req.get('http://localhost:3000/api/fournisseurs')).json();
  const autre = fournisseurs.find((f) => f.creerPar && !f.estMien);
  if (!autre) return { note: 'pas de fournisseur non-mien avec créateur', fournisseurs: fournisseurs.map(f=>({n:f.nomPren,c:f.creerPar,m:f.estMien})) };
  const r = await req.get('http://localhost:3000/api/fournisseurs/' + autre._id);
  return { autreFourn: { id: autre._id, nomPren: autre.nomPren, creerPar: autre.creerPar }, detail404: r.status() };
}
