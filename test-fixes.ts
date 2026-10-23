/**
 * test-fixes.ts — فحص آلي شامل لوحدات التحصين والوعي ورفيق الطريق ومركز الأخبار
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {
  CODE_HINTS,
  DebouncedJsonWriter,
  applyFixes,
  errorHandler,
  generateWithFailover,
  isSeedRecord,
  parseAgentEnvelope,
  readJsonFile,
  safeNormalizeQuery,
} from './fixes.ts';
import {
  analyzeQueryAwareness,
  buildAwareSystemInstruction,
  detectUserDialect,
  getAlgeriaTimeContext,
} from './awareness.ts';
import { maskContact, registerTravelCompanionRoutes } from './travelCompanion.ts';
import { registerNewsHubRoutes } from './newsHub.ts';

async function runTests() {
  console.log('1) فحص safeNormalizeQuery و CODE_HINTS و parseAgentEnvelope...');
  {
    const r1 = safeNormalizeQuery('مرحبا في تيدكلت و تدكلت لتعلم برمجه و خورزميات ذكاء اصطناعيي');
    assert.equal(
      r1.normalizedQuery,
      'مرحبا في تيديكلت و تيديكلت لتعلم برمجة و خوارزميات ذكاء اصطناعي'
    );
    assert.equal(r1.changed, true);

    // لا يفسد كلمة «السوائل»
    const r2 = safeNormalizeQuery('حركة السوائل في الأنابيب');
    assert.equal(r2.normalizedQuery, 'حركة السوائل في الأنابيب');
    assert.equal(r2.changed, false);

    // CODE_HINTS لا يطابق decode أو barcode
    assert.equal(CODE_HINTS.test('how to decode a barcode in unicode'), false);
    assert.equal(CODE_HINTS.test('اكتب لي كود python لحساب المساحة'), true);

    // parseAgentEnvelope
    assert.equal(parseAgentEnvelope('const x = { a: 1 };'), null);
    assert.equal(parseAgentEnvelope('{"foo":"bar"}'), null);
    const env = parseAgentEnvelope('```json\n{"text":"أهلاً بك","assignedAgent":{"id":"guide","name":"المرشد"}}\n```');
    assert.equal(env?.text, 'أهلاً بك');
    assert.equal(env?.assignedAgent?.id, 'guide');

    assert.equal(isSeedRecord({ id: 'seed_123' }), true);
    assert.equal(isSeedRecord({ id: 'real_123' }), false);
  }

  console.log('2) فحص DebouncedJsonWriter و readJsonFile...');
  {
    const tmpFile = path.join(os.tmpdir(), `tidikelt_test_${ process.pid }_${ Date.now() }.json`);
    const writer = new DebouncedJsonWriter(tmpFile, 50);
    writer.schedule({ count: 1 });
    writer.schedule({ count: 2, ok: true });
    await writer.flush();
    const loaded = readJsonFile<{ count: number; ok?: boolean }>(tmpFile, { count: 0 });
    assert.equal(loaded.count, 2);
    assert.equal(loaded.ok, true);
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }

  console.log('3) فحص generateWithFailover...');
  {
    const calls: string[] = [];
    const fakeAi = {
      models: {
        async generateContent({ model }: { model: string }) {
          calls.push(model);
          if (model === 'm1_404') {
            const err: any = new Error('model not found');
            err.status = 404;
            throw err;
          }
          if (model === 'm2_429') {
            const err: any = new Error('quota exceeded 429');
            err.status = 429;
            throw err;
          }
          return { text: `رد ناجح من ${model}` };
        },
      },
    };

    const res = await generateWithFailover(
      fakeAi,
      { contents: 'مرحبا' },
      { models: ['m1_404', 'm2_429', 'm3_ok'], timeoutMs: 2000 }
    );
    assert.equal(res?.model, 'm3_ok');
    assert.equal(res?.text, 'رد ناجح من m3_ok');
    assert.deepEqual(calls, ['m1_404', 'm2_429', 'm3_ok']);
  }

  console.log('4) فحص awareness.ts (الوعي الزمني واللهجة والمواضيع)...');
  {
    const timeCtx = getAlgeriaTimeContext();
    assert.ok(timeCtx.time24.includes(':'));
    assert.ok(timeCtx.summary.includes('GMT+1'));

    assert.equal(detectUserDialect('واش راك خويا شحال الساعة درك؟'), 'ar-dz');
    assert.equal(detectUserDialect('ما هي عاصمة الجزائر؟'), 'ar');

    const em = analyzeQueryAwareness('سيارتي غرزت في الرمل قرب أراك وأحتاج نجدة');
    assert.equal(em.isEmergency, true);
    assert.equal(em.matchedRoad?.code, 'RN1-S');

    const med = analyzeQueryAwareness('ما هو علاج ارتفاع ضغط الدم؟');
    assert.equal(med.needsSpecialistDisclaimer, true);

    const sysPrompt = buildAwareSystemInstruction({ query: 'واش حالة طريق تمنراست؟' });
    assert.ok(sysPrompt.includes('تيديكلت AI'));
    assert.ok(sysPrompt.includes('RN1-S'));
  }

  console.log('5) فحص خادم Express مع applyFixes + travelCompanion + newsHub...');
  {
    const prevAdminToken = process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN;

    const app = express();
    applyFixes(app);

    app.post('/api/chat', (req, res) => {
      res.json({
        hasSystemInstruction: 'systemInstruction' in (req.body || {}),
        hasTemperature: 'temperature' in (req.body || {}),
        message: req.body?.message,
      });
    });

    app.post('/api/global-settings', (_req, res) => {
      res.json({ ok: true });
    });

    const tmpTripsFile = path.join(os.tmpdir(), `trips_${Date.now()}.json`);
    const tmpNewsFile = path.join(os.tmpdir(), `news_${Date.now()}.json`);

    registerTravelCompanionRoutes(app, undefined, { storeFile: tmpTripsFile });
    registerNewsHubRoutes(app, undefined, { storeFile: tmpNewsFile });
    app.use(errorHandler);

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const addr = server.address() as { port: number };
    const base = `http://127.0.0.1:${addr.port}`;

    try {
      // (أ) عندما يكون ADMIN_TOKEN غير مضبوط، يفشل المسار الإداري بـ 503
      const r503 = await fetch(`${base}/api/global-settings`, { method: 'POST' });
      assert.equal(r503.status, 503);

      // (ب) ضبط ADMIN_TOKEN والتحقق من 401 ثم 200
      process.env.ADMIN_TOKEN = 'secret-test-admin-token';
      const r401 = await fetch(`${base}/api/global-settings`, {
        method: 'POST',
        headers: { 'x-admin-token': 'wrong' },
      });
      assert.equal(r401.status, 401);

      const r200 = await fetch(`${base}/api/global-settings`, {
        method: 'POST',
        headers: { 'x-admin-token': 'secret-test-admin-token' },
      });
      assert.equal(r200.status, 200);

      // (ج) حذف systemInstruction و temperature من طلب العميل في /api/chat
      const rChat = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: 'مرحبا',
          systemInstruction: 'hacked',
          temperature: 2.0,
        }),
      });
      const chatData: any = await rChat.json();
      assert.equal(chatData.hasSystemInstruction, false);
      assert.equal(chatData.hasTemperature, false);
      assert.equal(chatData.message, 'مرحبا');

      // (د) اختبار رفيق الطريق وإخفاء رقم الهاتف للعامة
      assert.equal(maskContact('0661234567'), '0661***67');
      const rPostTrip = await fetch(`${base}/api/companion/trips`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          from: 'عين صالح',
          to: 'أدرار',
          when: 'غداً 07:00',
          seats: 2,
          driverName: 'أحمد',
          contact: '0661998877',
          notes: 'انطلاق صباحي',
        }),
      });
      assert.equal(rPostTrip.status, 201);
      const postTripData: any = await rPostTrip.json();
      assert.equal(postTripData.trip.contact, '0661***77');

      // المسار الإداري لرفيق الطريق محمي ويعيد الرقم كاملاً للمشرف
      const rAdminTrips401 = await fetch(`${base}/api/companion/admin/trips`);
      assert.equal(rAdminTrips401.status, 401);
      const rAdminTrips200 = await fetch(`${base}/api/companion/admin/trips`, {
        headers: { 'x-admin-token': 'secret-test-admin-token' },
      });
      assert.equal(rAdminTrips200.status, 200);
      const adminTripsData: any = await rAdminTrips200.json();
      assert.equal(adminTripsData.trips[0].contact, '0661998877');

      // استشارة رفيق الطريق
      const rAskCompanion = await fetch(`${base}/api/companion/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'كيفاش طريق تمنراست عبر أراك؟' }),
      });
      assert.equal(rAskCompanion.status, 200);
      const askCompanionData: any = await rAskCompanion.json();
      assert.ok(askCompanionData.answer.includes('14'));

      // (هـ) اختبار مركز الأخبار المحلية
      const rNewsPost401 = await fetch(`${base}/api/news/local`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'خبر', summary: 'تفاصيل الخبر' }),
      });
      assert.equal(rNewsPost401.status, 401);

      const rNewsPost201 = await fetch(`${base}/api/news/local`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': 'secret-test-admin-token',
        },
        body: JSON.stringify({
          title: 'افتتاح سوق التمور الموسمي',
          summary: 'انطلاق فعاليات سوق التمور وسط مدينة عين صالح.',
          category: 'أسواق',
        }),
      });
      assert.equal(rNewsPost201.status, 201);

      const rDigest = await fetch(`${base}/api/news/digest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 3 }),
      });
      assert.equal(rDigest.status, 200);
      const digestData: any = await rDigest.json();
      assert.ok(digestData.digest.includes('افتتاح سوق التمور الموسمي'));
    } finally {
      server.close();
      if (prevAdminToken === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = prevAdminToken;
      try {
        fs.unlinkSync(tmpTripsFile);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(tmpNewsFile);
      } catch {
        /* ignore */
      }
    }
  }

  console.log('✅ اجتازت جميع الفحوصات بنجاح!');
}

runTests().catch((err) => {
  console.error('❌ فشل الفحص:', err);
  process.exit(1);
});
