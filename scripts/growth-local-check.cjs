const { chromium, expect } = require('../apps/web/node_modules/@playwright/test');
const fs = require('fs');
const base = 'http://127.0.0.1:4179';
const report = { summary: { visitors: 2, sessions: 2, active: 0, pageViews: 4, signups: 1, activated: 0, signupRate: 50, bounceRate: 50, avgEngagement: 25 }, funnel: ['page_view','signup_start','signup_submit','signup_success','feature_used'].map((type,i) => ({type,count:i===0?2:i===4?0:1,conversion:50,dropoff:1})), channels:[{label:'meta/cpc/qa',sessions:2,signups:1,conversion:50,bounce:50}], pages:[{page:'/',views:2,sessions:2,exits:1,exitRate:50,scroll:[25,50,75,90].map(depth=>({depth,count:1,rate:50}))}], heatmap:[{page:'/',device:'mobile',x:52.5,y:17.5,count:3}], targets:[{label:'/ · link:register',count:3}], errors:[], daily:[{date:'2026-09-14',sessions:2,signups:1}], sources:['meta'], sessions:[], vitals:[], firstCollectedAt:new Date().toISOString(),start:new Date().toISOString(),end:new Date().toISOString(),eventCount:8 };
async function main() {
  fs.mkdirSync('output/growth-audit', {recursive:true});
  const browser = await chromium.launch({headless:true});
  const results=[];
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const batches=[]; let legacy=0; let acceptSignup=false;
    await context.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if(path.endsWith('/analytics/growth/events')) {batches.push(...route.request().postDataJSON().events); return route.fulfill({json:{success:true,data:{accepted:1}}});}
      if(path.endsWith('/analytics/events')) {legacy++;return route.fulfill({status:401,json:{message:'auth required'}});}
      if(path.endsWith('/auth/register')) return route.fulfill(acceptSignup ? {json:{success:true,data:{user:{id:'qa',name:'QA',email:'qa@example.invalid',role:'user',subscriptionTier:'free'},accessToken:'qa',refreshToken:'qa'}}} : {status:409,json:{message:'이미 등록된 이메일입니다.'}});
      if(path.endsWith('/auth/login')) return route.fulfill({status:401,json:{message:'비밀번호가 올바르지 않습니다.',error:'INVALID_PASSWORD'}});
      return route.fulfill({json:{success:true,data:[]}});
    });
    const page=await context.newPage();
    await page.goto(base+'/?utm_source=meta&utm_medium=cpc&utm_campaign=qa',{waitUntil:'networkidle',timeout:90000});
    await page.locator('a[href="/register"]:visible').first().click();
    await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#name').fill('QA 검사');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');
    await page.locator('#licenseNumber').fill('12345');
    await page.getByRole('checkbox').first().click();
    await expect(page.locator('button[type=submit]')).toBeEnabled();
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('이미 등록된 이메일입니다.')).toBeVisible();
    await page.waitForTimeout(1800);
    await page.screenshot({path:'output/growth-audit/register-mobile-after.png',fullPage:true});
    if(legacy) throw new Error('Anonymous visitor hit protected analytics');
    if(!batches.some(e=>e.type==='signup_error' && e.code==='http_409')) throw new Error('Missing signup error event');
    if(!batches.some(e=>e.type==='signup_submit' && e.source==='meta')) throw new Error('Lost attribution');
    if(JSON.stringify(batches).includes('qa@example.invalid') || JSON.stringify(batches).includes('Password123')) throw new Error('PII leaked');
    results.push('Mobile signup works without license file, preserves attribution, collects sanitized failure');
    await page.goto(base+'/login',{waitUntil:'networkidle'});
    await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#password').fill('WrongPassword');
    await page.locator('button[type=submit]').click();
    await page.waitForTimeout(1000);
    if(new URL(page.url()).search.includes('session=expired')) throw new Error('Login error caused redirect');
    await expect(page.locator('#email')).toHaveValue('qa@example.invalid');
    results.push('401 login failure preserves form and does not force navigation');
    await page.goto(base+'/register',{waitUntil:'networkidle'});
    await page.waitForTimeout(31000);
    if(new URL(page.url()).pathname!=='/register'||legacy) throw new Error('Anonymous 30-second redirect regression');
    results.push('Anonymous registration remains on page beyond legacy 30-second flush');
    await context.close();
    const admin = await browser.newContext({viewport:{width:1440,height:1000}});
    await admin.addInitScript(()=>localStorage.setItem('auth-storage',JSON.stringify({state:{user:{id:'qa-admin',role:'admin',name:'QA',subscriptionTier:'clinic'},isAuthenticated:true,isGuest:false,accessToken:'qa',refreshToken:'qa'},version:0})));
    await admin.route('**/api/v1/**',route=>route.fulfill({json:{success:true,data:new URL(route.request().url()).pathname.endsWith('/admin/growth')?report:[]}}));
    const adminPage=await admin.newPage();
    await adminPage.goto(base+'/admin/growth',{waitUntil:'networkidle',timeout:90000});
    await expect(adminPage.getByRole('heading',{name:'유입 · 전환 분석'})).toBeVisible();
    const headingStyle=await adminPage.getByRole('heading',{name:'유입 · 전환 분석'}).evaluate(el=>({size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight}));
    if(parseFloat(headingStyle.size)<20 || Number(headingStyle.weight)<600)throw new Error('Tailwind styles are not loaded: '+JSON.stringify(headingStyle));
    await expect(adminPage.getByRole('img',{name:'/ mobile 클릭 분포 3회'})).toBeVisible();
    await adminPage.screenshot({path:'output/growth-audit/admin-desktop.png',fullPage:true});
    await adminPage.setViewportSize({width:390,height:844});
    await adminPage.waitForTimeout(500);
    await adminPage.screenshot({path:'output/growth-audit/admin-mobile.png',fullPage:true});
    if(await adminPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('Admin mobile overflow: '+JSON.stringify(await adminPage.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})))));
    results.push('Admin report and heatmap render on desktop/mobile without overflow');
    await admin.close();
    const privateContext=await browser.newContext(); let publicEvents=0;
    await privateContext.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{value:'1'}));
    await privateContext.route('**/api/v1/**',r=>{if(r.request().url().includes('/growth/events'))publicEvents++;return r.fulfill({json:{success:true,data:[]}})});
    const privatePage=await privateContext.newPage(); await privatePage.goto(base+'/register',{waitUntil:'networkidle'}); await privatePage.waitForTimeout(2000);
    if(publicEvents)throw new Error('DNT not honored');
    results.push('DNT prevents anonymous collection');
    fs.writeFileSync('output/growth-audit/local-checks.json',JSON.stringify(results,null,2));
    console.log(results.join('\n'));
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
