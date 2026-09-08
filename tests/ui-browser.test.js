const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.UI_BROWSER_CHANNEL ? {channel:process.env.UI_BROWSER_CHANNEL} : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://script.google.com/**', route => route.abort());
    const base = process.env.UI_TEST_URL || 'http://localhost:4173';
    await page.goto(`${base}/ui/showcase.html`);
    await page.locator('#example-name').fill('A learner');
    await page.getByRole('button', { name: 'Save student' }).click();
    assert.equal(await page.locator('[aria-busy="true"]').count(), 1);
    // Programmatic submission must also be blocked while the form is busy.
    await page.locator('#example-form').evaluate(form => form.requestSubmit());
    await page.getByRole('button', { name: 'Save student' }).waitFor();
    assert.equal(await page.locator('.toast').count(), 1);
    assert.match(await page.locator('#example-status').textContent(), /No data was saved/);

    const restoration = await page.evaluate(() => {
      const button = document.createElement('button');
      const icon = document.createElement('span');
      icon.textContent = 'Original icon';
      button.append(icon);
      button.disabled = true;
      EduwaveUI.setBusy(button, true, '<b>not HTML</b>');
      const escaped = button.textContent === '<b>not HTML</b>' && !button.querySelector('b');
      EduwaveUI.setBusy(button, true, 'Repeated');
      EduwaveUI.setBusy(button, false);
      return { escaped, sameNode: button.firstChild === icon, disabled: button.disabled, busy: button.hasAttribute('aria-busy') };
    });
    assert.deepEqual(restoration, { escaped: true, sameNode: true, disabled: true, busy: false });
    assert.equal(await page.evaluate(() => {
      const host = document.createElement('div');
      host.innerHTML = EduwaveUI.stateMarkup({title:'<img src=x onerror=alert(1)>', description:0});
      return host.querySelectorAll('img').length;
    }), 0);

    await page.getByRole('tab', { name: 'Assignments' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[role="tab"]:focus').textContent(), 'Attendance');
    assert.equal(await page.getByRole('tab', { name:'Attendance' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('[role="tab"]:focus').textContent(), 'Progress');
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#example-panel').evaluate(el => el === document.activeElement), true);

    await page.getByRole('button', {name:'Show error'}).click();
    assert.equal(await page.locator('.toast[role="alert"]').count(), 1);
    await page.locator('.toast[role="alert"] button').click();
    assert.equal(await page.locator('.toast[role="alert"]').count(), 0);
    await page.locator('#example-name').fill('');
    await page.getByRole('button', {name:'Save student'}).click();
    assert.equal(await page.locator('#example-name').getAttribute('aria-invalid'), 'true');
    await page.locator('#example-name').fill('Valid');
    assert.equal(await page.locator('#example-name').getAttribute('aria-invalid'), null);

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `showcase overflow at ${width}`);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.ui-state--loading .ui-state__mark').evaluate(el => parseFloat(getComputedStyle(el).animationDuration) < .001), true);
    await page.setViewportSize({width:375,height:900});
    await page.locator('#example-name').blur();
    await page.locator('.toast button').click();
    await page.evaluate(() => window.scrollTo(0,0));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({path:'tests/ui-showcase-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'tests/ui-showcase-desktop.png',fullPage:true});

    await page.goto(base);
    await page.locator('[data-open-portal]').first().click();
    assert.equal(await page.locator('#portal-dialog').evaluate(el => el.open), true);
    await page.getByRole('button', {name:'Create account', exact:true}).first().click();
    assert.equal(await page.locator('[data-parent-auth="signup"]').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#portal-dialog').evaluate(el => el.open), false);
    assert.equal(await page.locator('[data-open-portal]').first().evaluate(el => el === document.activeElement), true);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({width,height:900});
      const overflow = await page.evaluate(() => ({width:document.documentElement.scrollWidth, elements:[...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).slice(0,80).map(el => `${el.parentElement.className} > ${el.tagName}.${el.className}`)}));
      assert.ok(overflow.width <= width, `site overflow at ${width}: ${JSON.stringify(overflow)}`);
    }
    await page.setViewportSize({width:375,height:900});
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:'tests/ui-site-mobile.png',fullPage:true});
    assert.deepEqual(errors, []);
    console.log('UI browser checks passed: busy restoration, duplicate submit, escaped content, keyboard tabs, field validity, toast dismissal, dialog focus, reduced motion, and four responsive widths.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
