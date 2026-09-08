// Run against a local preview. Every backend request is intercepted; no live writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');

(async () => {
  const browser=await chromium.launch({headless:true, ...(process.env.UI_BROWSER_CHANNEL ? {channel:process.env.UI_BROWSER_CHANNEL} : {})});
  try {
    const page=await browser.newPage();
    const errors=[], requests=[], snapshots={};
    page.on('pageerror', error => errors.push(error.message));
    const parent={parent_id:'P1', name:'Parent Example', email:'parent@example.com'};
    const student={student_id:'S1', name:'Child Example', class_level:'8', enrollment_status:'active', resources:[], fees:[], attendance:[], progress:[]};
    const dashboard={children:[student], notifications:[], upiId:'', academyName:'Academy'};
    const admin={metrics:{parents:1, students:1, pendingTrials:0, openFees:0}, parents:[{...parent,status:'active'}], students:[student], families:[], unlinkedStudents:[], resources:[], assignments:[], submissions:[], fees:[], trials:[], announcements:[], reminders:[]};
    const base=process.env.UI_TEST_URL || 'http://localhost:4173';
    if (process.env.BASELINE_SCRIPT) {
      await page.route('**/script.js', route => route.fulfill({contentType:'text/javascript', body:fs.readFileSync(process.env.BASELINE_SCRIPT,'utf8')}));
    }
    await page.route('https://script.google.com/**', async route => {
      const request=route.request().postDataJSON();
      requests.push(request);
      const data=request.action==='parentDashboard'?{parent,dashboard}:request.action==='adminDashboard'?admin:{};
      await route.fulfill({contentType:'application/json', body:JSON.stringify({ok:true,data})});
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('eduwave_parent_session','parent-token');
      sessionStorage.setItem('eduwave_admin_session','admin-token');
    });
    await page.goto(base);
    await page.locator('#parent-greeting').filter({hasText:'Parent'}).waitFor({state:'attached'});
    await page.waitForFunction(() => document.querySelector('#admin-metrics').children.length > 0);
    await page.locator('[data-open-portal]').first().click();
    assert.equal(await page.locator('#parent-app').isVisible(), true);
    assert.match(await page.locator('#parent-dashboard').textContent(), /Child Example/);
    snapshots.parent=await page.locator('#parent-dashboard').innerHTML();
    await page.keyboard.press('Escape');
    await page.locator('[data-open-admin]').first().click();
    const tabs=await page.locator('[data-admin-tab]').evaluateAll(nodes => nodes.map(node => node.dataset.adminTab));
    for (const tab of tabs) {
      await page.locator(`[data-admin-tab="${tab}"]`).click();
      assert.ok((await page.locator('#admin-content').textContent()).trim(), `${tab} must render`);
      snapshots[tab]=await page.locator('#admin-content').innerHTML();
    }
    await page.locator('#admin-logout').click();
    await page.waitForFunction(() => sessionStorage.getItem('eduwave_admin_session') === null);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('eduwave_admin_session')), null);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('eduwave_parent_session')), 'parent-token');
    assert.deepEqual(requests.map(x=>x.action), ['parentDashboard','adminDashboard','logout']);
    assert.deepEqual(errors, []);
    if (process.env.PORTAL_SNAPSHOT) fs.writeFileSync(process.env.PORTAL_SNAPSHOT,JSON.stringify(snapshots,null,2));
    console.log(`Portal browser passed: restored both roles, parent dashboard, ${tabs.length} admin tabs, independent logout, no runtime errors.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
