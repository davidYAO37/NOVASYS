export default async function run(page, ui) {
  const out = {};
  await page.goto('http://localhost:3000/connexion', { waitUntil: 'networkidle' });
  await page.waitForSelector('input', { timeout: 30000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@novasys.local');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("connecter")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {});

  await page.goto('http://localhost:3000/dashboard/devis', { waitUntil: 'networkidle' });
  await page.waitForSelector('table tbody tr', { timeout: 30000 });
  await page.waitForTimeout(1200);

  // bouton Proforma de la première ligne (DEV-2026-0005, tri desc)
  const btn = page.locator('tbody tr').first().locator('button[title="Proforma"]');
  await btn.click();
  await page.waitForSelector('.modal-apercu-pdf .modal-content', { timeout: 10000 });
  await page.waitForSelector('.modal-apercu-pdf iframe', { timeout: 10000 });
  await page.waitForTimeout(2500); // chargement iframe

  for (const [w, h, tag] of [[1366, 768, '1366'], [1920, 1080, '1920']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    out[tag] = await page.evaluate(() => {
      const mc = document.querySelector('.modal-apercu-pdf .modal-content')?.getBoundingClientRect();
      const fr = document.querySelector('.modal-apercu-pdf iframe')?.getBoundingClientRect();
      const ft = document.querySelector('.modal-apercu-pdf .modal-footer')?.getBoundingClientRect();
      return {
        viewport: { w: innerWidth, h: innerHeight },
        modalContent: mc && { w: Math.round(mc.width), h: Math.round(mc.height), top: Math.round(mc.top), left: Math.round(mc.left) },
        iframe: fr && { w: Math.round(fr.width), h: Math.round(fr.height) },
        footer: ft && { top: Math.round(ft.top), bottom: Math.round(ft.bottom), visible: ft.bottom <= innerHeight && ft.top >= 0 },
      };
    });
    await page.screenshot({ path: `.qa/apercu-${tag}.png` });
  }
  return out;
}
