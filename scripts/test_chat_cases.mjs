import assert from "node:assert/strict";

const APP_URL = process.env.TEST_APP_URL || (process.env.APP_URL && !process.env.APP_URL.includes("ais-") ? process.env.APP_URL : "http://127.0.0.1:3000");

const cases = [
  {
    id: "رقم الطوارئ",
    message: "ما رقم الحماية المدنية في حالة الاستعجال؟",
    knowledge: [
      {
        id: "official-emergency-numbers",
        title: "أرقام الطوارئ",
        text: "رقم الحماية المدنية في الجزائر هو 14."
      }
    ],
    expectedFacts: [
      { id: "civil-protection-number", value: "14" }
    ],
    expectedSourceIds: ["official-emergency-numbers"],
    requiredText: ["14", "الحماية المدنية"],
    shouldAbstain: false
  },
  {
    id: "معلومة غير موجودة",
    message: "ما رقم هاتف صيدلية معينة في عين صالح؟",
    knowledge: [],
    expectedFacts: [],
    expectedSourceIds: [],
    requiredText: [],
    shouldAbstain: true
  }
];

const styles = ["ar", "ar-dz"];
const genericPhrases = [
  "إعادة التأكيد",
  "يرتبط موضوع",
  "جوانب معرفية وعملية"
];

function sortedFacts(facts = []) {
  return facts
    .map(({ id, value }) => ({ id, value }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function sortedIds(ids = []) {
  return [...ids].sort();
}

async function ask(testCase, replyStyle) {
  const response = await fetch(`${APP_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "chat",
      replyStyle,
      message: testCase.message,
      knowledge: testCase.knowledge
    })
  });

  const rawBody = await response.text();
  let result;
  try {
    result = JSON.parse(rawBody);
  } catch (err) {
    throw new Error(`${testCase.id} / ${replyStyle}: Expected JSON but received: ${rawBody.slice(0, 200)} (status ${response.status})`);
  }

  assert.equal(
    response.ok,
    true,
    `${testCase.id} / ${replyStyle}: فشل الطلب — ${result.error || response.status}`
  );

  assert.equal(typeof result.answer, "string");
  assert.ok(result.answer.trim().length > 0, "الإجابة فارغة");

  for (const phrase of genericPhrases) {
    assert.ok(
      !result.answer.includes(phrase),
      `${testCase.id} / ${replyStyle}: ظهر قالب عام غير مرغوب`
    );
  }

  for (const text of testCase.requiredText) {
    assert.ok(
      result.answer.includes(text),
      `${testCase.id} / ${replyStyle}: الإجابة لا تتضمن "${text}"`
    );
  }

  assert.deepEqual(
    sortedFacts(result.facts),
    sortedFacts(testCase.expectedFacts),
    `${testCase.id} / ${replyStyle}: الحقائق لا تطابق المتوقع`
  );

  assert.deepEqual(
    sortedIds(result.citedSourceIds),
    sortedIds(testCase.expectedSourceIds),
    `${testCase.id} / ${replyStyle}: معرّفات المصادر غير صحيحة`
  );

  if (testCase.shouldAbstain) {
    const abstentionPattern = replyStyle === "ar-dz"
      ? /ما لقيتش|ما عنديش|ما نقدرش نأكد|ما كاينش/
      : /لم أجد|لا أملك|لا أستطيع التأكد|غير متوفر/;

    assert.match(
      result.answer,
      abstentionPattern,
      `${testCase.id} / ${replyStyle}: كان ينبغي التصريح بعدم توفر المعلومة`
    );
  }

  return result;
}

console.log("Running chat integration tests...");
for (const testCase of cases) {
  console.log(`Testing case: ${testCase.id}...`);
  const fusha = await ask(testCase, "ar");
  const darija = await ask(testCase, "ar-dz");

  // يجب أن تبقى الحقائق والمصادر نفسها؛ الاختلاف في الصياغة فقط
  assert.deepEqual(
    sortedFacts(fusha.facts),
    sortedFacts(darija.facts),
    `${testCase.id}: اختلفت الحقائق بين الفصحى والدارجة`
  );
  assert.deepEqual(
    sortedIds(fusha.citedSourceIds),
    sortedIds(darija.citedSourceIds),
    `${testCase.id}: اختلفت المصادر المقتبسة بين الفصحى والدارجة`
  );
  console.log(`Passed: ${testCase.id}`);
}

console.log("All chat test cases passed successfully!");
