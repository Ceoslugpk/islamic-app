import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/ubuntu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const root = path.resolve('dist'), output = path.resolve('proof/color-batch-3d');
for (const screen of ['Settings', 'Legal']) {
  const source = fs.readFileSync(`src/screens/${screen}Screen.tsx`, 'utf8');
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b|rgba?\(|HOME_THEME_TOKENS|backgroundColor:\s*(?:tokens|homeTokens|themeTokens)\.(?:accent|gold)\b/, `${screen} palette`);
}
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req,res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.resolve(root, '.' + (urlPath === '/' ? '/index.html' : urlPath));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const tabs = [['settings','Settings',null],['privacy','Privacy Policy','Our Commitment to Privacy'],['terms','Terms of Use','Free Service as Sadaqah Jariyah'],['data','Data & Privacy','What Data is Stored Locally'],['licenses','Open Source Licenses','Open Source Foundation'],['services','Third-Party Services','Free Public APIs & Open Data'],['contact','Contact & Feedback','Community Support & Feedback']];
const prayerFixture = {code:200,data:{timings:{Fajr:'05:00',Sunrise:'06:20',Dhuhr:'12:15',Asr:'15:30',Maghrib:'18:10',Isha:'19:30'},date:{readable:'13 Oct 2026',hijri:{day:'1',month:{en:'Rabi al-Thani'},year:'1448'},gregorian:{date:'13-10-2026'}},meta:{timezone:'UTC',school:'Shafi'}}};
const rows = [];
try {
  for (const theme of ['paper','ink']) {
    const context = await browser.newContext({viewport:{width:393,height:852}});
    try {
      await context.route('**/api.islamic.app/v1/timings/**', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(prayerFixture)}));
      await context.addInitScript(theme => {
        localStorage.setItem('onboardingDone','true');
        localStorage.setItem('location-setup-dismissed-v1','true');
        localStorage.setItem('islamic-settings',JSON.stringify({language:'en',themeMode:theme,locationMode:'manual',manualLocation:{latitude:21.42,longitude:39.83,city:'Makkah'}}));
      },theme);
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
      await page.waitForFunction(() => !!window.__NAVIGATE__);
      await page.waitForTimeout(900);
      await page.evaluate(() => window.__NAVIGATE__.setSettingsOpen(true));
      await page.getByText('Settings',{exact:true}).filter({visible:true}).first().waitFor();
      for (const [id,title,content] of tabs) {
        if (id !== 'settings') {
          if (id === 'privacy') {
            await page.getByText(/Privacy Policy · Backup & Restore · v/).filter({visible:true}).click();
            await page.getByText('No tracking, no accounts, data stays on device',{exact:true}).filter({visible:true}).click();
          } else {
            await page.getByRole('tab',{name:new RegExp(`^${id === 'licenses' ? 'Licenses' : id === 'services' ? 'Services' : id === 'contact' ? 'Contact' : id === 'data' ? 'Data' : 'Terms'}$`)}).click();
          }
        }
        await page.getByText(title,{exact:true}).filter({visible:true}).first().waitFor();
        if (content) await page.getByText(content,{exact:true}).filter({visible:true}).first().waitFor();
        const text = await page.locator('body').innerText();
        assert.doesNotMatch(text,/could(?:n't|n’t| not) load|try again later|loading\.\.\.|can't load prayer times|Preparing dashboard/i);
        const styles = await page.evaluate(() => ({gradients:[...document.querySelectorAll('*')].filter(el=>getComputedStyle(el).backgroundImage.includes('gradient')).length, cards:[...document.querySelectorAll('*')].filter(el=>{ const c=getComputedStyle(el); return parseFloat(c.borderTopWidth)>=0.7 && parseFloat(c.borderTopWidth)<=1 && c.borderTopColor !== 'rgba(0, 0, 0, 0)'; }).length}));
        assert.ok(styles.gradients > 0 && styles.cards > 0,`${id}/${theme} styles ${JSON.stringify(styles)}`);
        const file = `${id}_${theme}_393x852.png`;
        await page.screenshot({path:path.join(output,file)});
        rows.push({id,theme,title,content,file,...styles});
        console.log('PASS',id,theme,styles);
      }
      await page.locator('[data-testid="sub-header-back-btn"]').click();
      await page.getByText('Settings',{exact:true}).filter({visible:true}).first().waitFor();
      await page.getByText('Women\'s Worship',{exact:true}).filter({visible:true}).last().click();
      await page.getByRole('switch',{name:/Women.s Worship/}).first().click();
      await page.getByText('Private & On-Device',{exact:true}).filter({visible:true}).waitFor();
      const consent = page.getByText('I Understand',{exact:true}).filter({visible:true});
      const consentBackground = await consent.evaluate(el => getComputedStyle(el.parentElement.querySelector('div')).backgroundImage);
      assert.match(consentBackground,/gradient/,`${theme} consent primary must use gold gradient`);
      await page.getByText('Cancel',{exact:true}).filter({visible:true}).click();
      assert.equal(await page.getByText('Private & On-Device',{exact:true}).filter({visible:true}).count(),0);
    } finally { await context.close(); }
  }
  const expected = tabs.flatMap(([id])=>['paper','ink'].map(theme=>`${id}_${theme}_393x852.png`)).sort();
  assert.deepEqual(fs.readdirSync(output).filter(f=>f.endsWith('.png')).sort(),expected);
  assert.equal(rows.length,expected.length);
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({batch:'3D',status:'PASS',totalScreenshots:rows.length,screenshots:rows},null,2));
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
