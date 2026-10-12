import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateExpression } from '../../../src/input/helpers/expression.ts';

test('arithmetic follows precedence, parentheses, unary signs and decimal notation', () => {
  for (const [source, expected] of [
    ['1920 / 2', 960],
    ['2 + 3 * 4', 14],
    ['(2 + 3) * 4', 20],
    ['-(-2 + 3) * +4', -4],
    ['1e2 / .5', 200],
    ['0.1 + 0.2', 0.3],
    [' 20 / 2 / 5 ', 2],
    ['10 - 3 - 2', 5],
    ['1+-2', -1],
    ['1234567890123456', 1234567890123456],
  ] as const)
    assert.equal(evaluateExpression(source), expected, source);
});

test('malformed, non-finite and executable expressions are rejected', () => {
  for (const source of [
    '',
    ' ',
    '1+',
    '1 / 0',
    '0 / 0',
    '1e309',
    '1e308 * 10',
    '(2 + 3',
    '2 + 3)',
    '2(3)',
    '1 2',
    '2 ** 3',
    '50%',
    '0xff',
    'Math.random()',
    'globalThis.alert(1)',
    '1;2',
    'constructor.constructor("return 1")()',
    '('.repeat(100) + '1' + ')'.repeat(100),
    '1'.repeat(5000),
  ])
    assert.ok(Number.isNaN(evaluateExpression(source)), source);
});
