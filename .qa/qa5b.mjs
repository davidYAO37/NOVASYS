export default async function run(page) {
  const out = {};
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});
  for (const [w, h, tag] of [[1366, 768, 'a1366'], [1920, 1080, 'a1920']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('http://localhost:3000/dashboard/achats', { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    await page.waitForTimeout(800);
    await page.locator('tbody tr').first().locator('button').first().click();
    await page.waitForSelector('.modal-apercu-pdf iframe', { timeout: 10000 });
    await page.waitForTimeout(2500);
    out[tag] = await page.evaluate(() => {
      const fr = document.querySelector('.modal-apercu-pdf iframe')?.getBoundingClientRect();
      const mc = document.querySelector('.modal-apercu-pdf .modal-content')?.getBoundingClientRect();
      const top = fr && document.elementFromPoint(fr.left + fr.width / 2, fr.top + 40);
      return { modals: document.querySelectorAll('.modal.show').length,
        backdrops: document.querySelectorAll('.modal-backdrop.show').length,
        modalContent: mc && { w: Math.round(mc.width), h: Math.round(mc.height) },
        iframe: fr && { w: Math.round(fr.width), h: Math.round(fr.height), pctH: Math.round(fr.height / innerHeight * 100) },
        elementAuCentre: top?.tagName };
    });
    await page.screenshot({ path: `.qa/bc-${tag}-apercu.png` });
    await page.locator('.modal-apercu-pdf button:has-text("Fermer")').first().click();
    await page.waitForTimeout(600);
    out[tag].apresFermeture = await page.evaluate(() => ({
      modalsRestantes: document.querySelectorAll('.modal.show').length,
      bodyModalOpen: document.body.classList.contains('modal-open') }));
  }
  return out;
}
