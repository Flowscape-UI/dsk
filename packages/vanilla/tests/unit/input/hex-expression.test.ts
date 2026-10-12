import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateHexExpression } from '../../../src/input/helpers/hex-expression.ts';
import { formatHex, parseHex } from '../../../src/input/helpers/hex.ts';

test('plain HEX values take precedence over decimal and exponent notation', () => {
  assert.equal(evaluateHexExpression('10', 2), 16);
  assert.equal(evaluateHexExpression('  #aB  ', 2), 171);
  assert.equal(evaluateHexExpression('1e3', 3), parseHex('1E3', 3));
  assert.equal(evaluateHexExpression('1e3', 6), parseHex('0001E3', 6));
  assert.equal(evaluateHexExpression('f', 2), 15);
  assert.equal(evaluateHexExpression('FF0000', 6), 255);
  assert.equal(evaluateHexExpression('FFFFFFFF', 8), 4294967295);
});

test('arithmetic uses decimal scalars and explicit HEX channel literals', () => {
  for (const [source, expected] of [
    ['10 + 1', 11],
    ['(10)', 10],
    ['+10', 10],
    ['1e3 + 0', 1000],
    ['0x10', 16],
    ['0Xff + 10', 265],
    ['#10 + 10', 26],
    ['(0x10 + #10) * 2', 64],
    ['-(-#10 + 2) * +2', 28],
    ['#10--1', 17],
    ['#10 / 2 + 0.5 * 2', 9],
    ['0.5 + 0.5', 1],
  ] as const) {
    assert.equal(evaluateHexExpression(source, 2), expected, source);
  }
});

test('explicit color literals use red-first carry and preserve overflow for clamping', () => {
  const carry = evaluateHexExpression('0xFF0000 + 1', 6);
  assert.equal(carry, 256);
  assert.equal(formatHex(carry, 6), '000100');
  assert.equal(
    formatHex(evaluateHexExpression('#FFFFFF00 + 1', 8), 8),
    '00000001',
  );
  assert.equal(evaluateHexExpression('#FFFFFFFF + 1', 8), 4294967296);
  assert.equal(evaluateHexExpression('#00000000 - 1', 8), -1);
  assert.equal(evaluateHexExpression('#F + 1', 1), 16);
});

test('rejects fractional final values and non-finite arithmetic', () => {
  for (const source of [
    '1 / 2',
    '0.5',
    '#FF / 2',
    '1 / 0',
    '#00 / 0',
    '1e309 + 0',
    '1e308 * 10',
    'Infinity',
    'NaN',
  ]) {
    assert.ok(Number.isNaN(evaluateHexExpression(source, 2)), source);
  }
});

test('rejects malformed or adjacent literals instead of merging their digits', () => {
  for (const source of [
    '',
    ' ',
    '0x',
    '#',
    '##AB',
    '#0xAB',
    '10xFF',
    '1#AB',
    '1 #AB',
    '1 0xAB',
    '0xFF1',
    '#ABC',
    'ABC',
    '123',
    '0xFF + #ABC',
    '0xFF + 0xABC',
    '#AB #CD',
    '#AB#CD',
    '#AB 1',
    '#AB.1',
    '0xFFg',
    'AB + 1',
    '(1)#AB',
    '#AB(1)',
    '#AB ** 2',
    '#AB +',
    '#AB + (1',
  ]) {
    assert.ok(Number.isNaN(evaluateHexExpression(source, 2)), source);
  }
});

test('never executes expressions and retains input and nesting limits', () => {
  for (const source of [
    'Math.random()',
    'globalThis.process.exit()',
    'constructor.constructor("return 1")()',
    '#AB; 1',
    'globalThis.hexExpressionTouched = 1',
    '('.repeat(100) + '#AB' + ')'.repeat(100),
    ' '.repeat(4096) + '1',
    '#AB'.padEnd(4097),
  ]) {
    assert.ok(Number.isNaN(evaluateHexExpression(source, 2)), source);
  }
  assert.equal(evaluateHexExpression('#AB'.padEnd(4096), 2), 171);
  assert.equal(evaluateHexExpression('123 + 0', 2), 123);
});
