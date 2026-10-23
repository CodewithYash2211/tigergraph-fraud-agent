const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...args);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (mod, filename) =>
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { mapBackendToAnswerFile } = require('../lib/api/backend.ts');
const { normalizeML } = require('../lib/data/ml-assessment.ts');
const { MLAssessmentCard } = require('../components/investigation/MLAssessment.tsx');
const fixture = require('./live-HHG-001.json');
function live(ml = {}) {
  const raw = structuredClone(fixture);
  raw.result.case_id = 'CASE-OTHER';
  raw.result.risk_score = '0.21';
  for (const e of raw.result.evidence || []) if (e.type === 'transaction') e.data.risk_score = '0.21';
  raw.result.ml_prediction = { available: true, fraud_score: .7345, threshold: .64, prediction: 'fraud',
    model_name: 'XGBoost', model_version: 'test-version', feature_schema_version: 'core-test', ...ml };
  return mapBackendToAnswerFile(raw, 'CASE-OTHER').live;
}
const render = props => renderToStaticMarkup(React.createElement(MLAssessmentCard, props));

test('API adapter and actual card render response scores, threshold, prediction and metadata separately', () => {
  const html = render({live: live()});
  for (const text of ['73.45%', '64.00%', 'FRAUD', 'XGBoost', 'test-version', 'core-test', 'Existing risk_score', '0.21']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('does not independently determine the final policy action'));
  assert.ok(!html.includes('probability'));
});
test('changed response values render without case-specific constants', () => {
  const html = render({live: live({fraud_score: .1234, threshold: .4567, prediction: 'cleared'})});
  for (const text of ['12.34%', '45.67%', 'CLEARED']) assert.ok(html.includes(text));
  for (const file of ['components/investigation/MLAssessment.tsx', 'lib/data/ml-assessment.ts']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, /HHG-001|HHG-014|0\.981408|0\.896154/);
  }
});
test('unavailable state never renders a supplied stale score', () => {
  const html = render({live: live({available: false})});
  assert.match(html, /ML assessment unavailable/);
  assert.doesNotMatch(html, /73.45%|64.00%/);
});
test('errors show safe fixed text and never raw secrets or stack traces', () => {
  const html = render({live: live({available: false, error: {code: 'inference_timeout', message: 'SECRET stack trace'}})});
  assert.match(html, /ML assessment timed out/);
  assert.doesNotMatch(html, /SECRET|stack trace/);
  const unknown = render({live: live({error: 'SECRET traceback'})});
  assert.match(unknown, /could not be completed/);
  assert.doesNotMatch(unknown, /SECRET|traceback|73.45%/);
});
test('no-data and old cached answers do not invent model or risk scores', () => {
  const html = render({});
  assert.match(html, /No ML assessment data/);
  assert.doesNotMatch(html, /\d+\.\d+%/);
  assert.equal(normalizeML(undefined), undefined);
});
test('loading hides stale result; request failure is explicit', () => {
  const html = render({live: live(), loading: true});
  assert.match(html, /Loading ML assessment/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /73.45%|21.00%/);
  assert.match(render({live: live(), failed: true}), /Investigation request failed/);
});
test('invalid values cannot render as zero, NaN or an out-of-range score', () => {
  for (const score of [null, '', NaN, Infinity, 2, -1, true]) {
    const html = render({live: live({fraud_score: score})});
    assert.match(html, /ML assessment unavailable/);
    assert.doesNotMatch(html, /NaN%|Infinity%|XGBoost Fraud Score<\/dt>/);
  }
  assert.match(render({live: live({fraud_score: 0})}), /0.00%/);
});
test('adding shadow ML does not alter existing assessment or actions', () => {
  const raw = structuredClone(fixture);
  const before = mapBackendToAnswerFile(raw, raw.result.case_id);
  raw.result.ml_prediction = {available: true, fraud_score: 1, threshold: .8, prediction: 'fraud'};
  const after = mapBackendToAnswerFile(raw, raw.result.case_id);
  assert.deepEqual(after.case, before.case);
  assert.deepEqual(after.next_best_actions, before.next_best_actions);
});
