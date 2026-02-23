/**
 * Pizza Calculation Tests
 * 
 * Run these tests to verify pizza pricing calculations are working correctly.
 * Tests both flavor pricing models (maior/media/partes) and optional calculation modes.
 * 
 * Import and call runPizzaCalculationTests() to execute all tests.
 */

import { calculatePizzaOptionals, type PizzaOptionalInput } from './calculatePizzaOptionals';
import { calculatePizzaPrice, getPizzaPriceBreakdown, type SimplifiedFlavorPrice } from '@/hooks/useFlavors';

interface TestResult {
  name: string;
  passed: boolean;
  expected: number;
  actual: number;
  details?: string;
}

// ==============================================
// FLAVOR PRICING MODEL TESTS (maior/media/partes)
// ==============================================

function testFlavorPricingModels(): TestResult[] {
  const results: TestResult[] = [];

  // Test data: 2 flavors with different BASE prices
  const flavorA: SimplifiedFlavorPrice[] = [
    { size_name: 'grande', price_full: 80 },
    { size_name: 'média', price_full: 60 },
  ];
  
  const flavorB: SimplifiedFlavorPrice[] = [
    { size_name: 'grande', price_full: 90 },
    { size_name: 'média', price_full: 70 },
  ];

  const selectedFlavors = [
    { flavorId: 'a', prices: flavorA },
    { flavorId: 'b', prices: flavorB },
  ];

  // TEST 1: Modelo MAIOR - deve cobrar o maior preço base
  // Pizza 2 sabores: A=R$80, B=R$90 → total = R$90
  const maiorResult = calculatePizzaPrice(selectedFlavors, 'grande', 'maior');
  results.push({
    name: 'Modelo MAIOR: Pizza 2 sabores (base 80 + 90) → cobrar 90',
    passed: maiorResult === 90,
    expected: 90,
    actual: maiorResult,
    details: 'Cobra o MAIOR preço base entre os sabores selecionados',
  });

  // TEST 2: Modelo MÉDIA - deve cobrar a média dos preços base
  // Pizza 2 sabores: A=R$80, B=R$90 → total = (80+90)/2 = R$85
  const mediaResult = calculatePizzaPrice(selectedFlavors, 'grande', 'media');
  results.push({
    name: 'Modelo MÉDIA: Pizza 2 sabores (base 80 + 90) → cobrar 85',
    passed: mediaResult === 85,
    expected: 85,
    actual: mediaResult,
    details: 'Cobra a MÉDIA dos preços base',
  });

  // TEST 3: Modelo PARTES - soma proporcional
  // Pizza 2 sabores: A=R$80/2 + B=R$90/2 = 40 + 45 = R$85
  const partesResult = calculatePizzaPrice(selectedFlavors, 'grande', 'partes');
  results.push({
    name: 'Modelo PARTES: Pizza 2 sabores (80/2 + 90/2) → cobrar 85',
    passed: partesResult === 85,
    expected: 85,
    actual: partesResult,
    details: 'Cada sabor contribui com preço_base / num_sabores',
  });

  // TEST 4: Modelo PARTES com 3 sabores
  const flavorC: SimplifiedFlavorPrice[] = [
    { size_name: 'grande', price_full: 75 },
  ];
  const threeFlavors = [
    { flavorId: 'a', prices: flavorA },
    { flavorId: 'b', prices: flavorB },
    { flavorId: 'c', prices: flavorC },
  ];
  // 80/3 + 90/3 + 75/3 = 26.67 + 30 + 25 = 81.67
  const partes3Result = calculatePizzaPrice(threeFlavors, 'grande', 'partes');
  const expected3 = (80/3) + (90/3) + (75/3); // ~81.67
  results.push({
    name: 'Modelo PARTES: Pizza 3 sabores (80+90+75 / 3 partes cada)',
    passed: Math.abs(partes3Result - expected3) < 0.01,
    expected: parseFloat(expected3.toFixed(2)),
    actual: parseFloat(partes3Result.toFixed(2)),
    details: 'Soma proporcional para 3 sabores',
  });

  // TEST 5: Breakdown test - verifica se mostra contribuição correta
  const flavorsFull = [
    { flavorId: 'a', flavorName: 'Calabresa', prices: flavorA },
    { flavorId: 'b', flavorName: 'Mussarela', prices: flavorB },
  ];
  const breakdown = getPizzaPriceBreakdown(flavorsFull, 'grande', 'partes');
  results.push({
    name: 'Breakdown PARTES: mostra contribuição de cada sabor',
    passed: breakdown.breakdown.length === 2 && 
            breakdown.breakdown[0].contribution === 40 &&
            breakdown.breakdown[1].contribution === 45,
    expected: 85,
    actual: breakdown.total,
    details: `Calabresa: R$40, Mussarela: R$45. ${breakdown.explanation}`,
  });

  return results;
}

// ==============================================
// OPTIONAL CALCULATION MODE TESTS
// ==============================================

function testOptionalCalculationModes(): TestResult[] {
  const results: TestResult[] = [];
  const flavorNames = { 'flavor1': 'Calabresa', 'flavor2': 'Mussarela' };

  // TEST 1: sum_each_part - multiplica pelo número de partes
  const sumEachPartOptionals: PizzaOptionalInput[] = [{
    group_id: 'g1',
    group_name: 'Adicionais',
    item_id: 'i1',
    item_label: 'Borda Recheada',
    price: 4,
    target_scope: 'whole_pizza',
    calc_mode: 'sum_each_part',
  }];
  const sumResult = calculatePizzaOptionals(sumEachPartOptionals, 2, flavorNames);
  results.push({
    name: 'sum_each_part: R$4 × 2 partes = R$8',
    passed: sumResult.total === 8,
    expected: 8,
    actual: sumResult.total,
    details: sumResult.breakdown[0]?.explanation,
  });

  // TEST 2: proportional - valor fixo independente das partes
  const proportionalOptionals: PizzaOptionalInput[] = [{
    group_id: 'g1',
    group_name: 'Adicionais',
    item_id: 'i1',
    item_label: 'Extra Queijo',
    price: 6,
    target_scope: 'whole_pizza',
    calc_mode: 'proportional',
  }];
  const propResult = calculatePizzaOptionals(proportionalOptionals, 3, flavorNames);
  results.push({
    name: 'proportional: R$6 fixo (3 partes) = R$6',
    passed: propResult.total === 6,
    expected: 6,
    actual: propResult.total,
    details: propResult.breakdown[0]?.explanation,
  });

  // TEST 3: pizza_total_split - valor total, exibe por parte
  const totalSplitOptionals: PizzaOptionalInput[] = [{
    group_id: 'g1',
    group_name: 'Adicionais',
    item_id: 'i1',
    item_label: 'Bacon Extra',
    price: 8,
    target_scope: 'whole_pizza',
    calc_mode: 'pizza_total_split',
  }];
  const splitResult = calculatePizzaOptionals(totalSplitOptionals, 2, flavorNames);
  results.push({
    name: 'pizza_total_split: R$8 total (R$4/parte ref)',
    passed: splitResult.total === 8,
    expected: 8,
    actual: splitResult.total,
    details: splitResult.breakdown[0]?.explanation,
  });

  // TEST 4: max_part_value - cobra apenas o maior
  const maxPartOptionals: PizzaOptionalInput[] = [
    {
      group_id: 'g1',
      group_name: 'Adicionais',
      item_id: 'i1',
      item_label: 'Extra Queijo A',
      price: 3,
      target_scope: 'flavor1',
      calc_mode: 'max_part_value',
    },
    {
      group_id: 'g1',
      group_name: 'Adicionais',
      item_id: 'i2',
      item_label: 'Extra Queijo B',
      price: 5,
      target_scope: 'flavor2',
      calc_mode: 'max_part_value',
    },
  ];
  const maxResult = calculatePizzaOptionals(maxPartOptionals, 2, flavorNames);
  results.push({
    name: 'max_part_value: R$3 vs R$5 = cobra R$5',
    passed: maxResult.total === 5,
    expected: 5,
    actual: maxResult.total,
    details: 'Cobra apenas o maior valor entre as partes',
  });

  // TEST 5: per_flavor_part - aplica só no sabor específico
  const perFlavorOptionals: PizzaOptionalInput[] = [{
    group_id: 'g1',
    group_name: 'Adicionais',
    item_id: 'i1',
    item_label: 'Extra Calabresa',
    price: 4,
    target_scope: 'flavor1', // Só na Calabresa
    calc_mode: 'per_flavor_part',
  }];
  const perFlavorResult = calculatePizzaOptionals(perFlavorOptionals, 2, flavorNames);
  // R$4 / 2 partes = R$2 (só na metade da Calabresa)
  results.push({
    name: 'per_flavor_part: R$4 só na Calabresa (1/2) = R$2',
    passed: perFlavorResult.total === 2,
    expected: 2,
    actual: perFlavorResult.total,
    details: perFlavorResult.breakdown[0]?.explanation,
  });

  return results;
}

// ==============================================
// RUN ALL TESTS
// ==============================================

export function runPizzaCalculationTests(): {
  flavorTests: TestResult[];
  optionalTests: TestResult[];
  summary: { total: number; passed: number; failed: number };
} {
  const flavorTests = testFlavorPricingModels();
  const optionalTests = testOptionalCalculationModes();
  
  const allTests = [...flavorTests, ...optionalTests];
  const passed = allTests.filter(t => t.passed).length;
  const failed = allTests.filter(t => !t.passed).length;

  console.group('🍕 Pizza Calculation Tests');
  
  console.group('📊 Flavor Pricing Models (maior/media/partes)');
  flavorTests.forEach(t => {
    const icon = t.passed ? '✅' : '❌';
    console.log(`${icon} ${t.name}`);
    if (!t.passed) {
      console.log(`   Expected: ${t.expected}, Got: ${t.actual}`);
    }
    if (t.details) console.log(`   ${t.details}`);
  });
  console.groupEnd();
  
  console.group('🔧 Optional Calculation Modes (5 modos)');
  optionalTests.forEach(t => {
    const icon = t.passed ? '✅' : '❌';
    console.log(`${icon} ${t.name}`);
    if (!t.passed) {
      console.log(`   Expected: ${t.expected}, Got: ${t.actual}`);
    }
    if (t.details) console.log(`   ${t.details}`);
  });
  console.groupEnd();
  
  console.log(`\n📋 Summary: ${passed}/${allTests.length} passed`);
  if (failed > 0) console.log(`⚠️ ${failed} test(s) failed`);
  
  console.groupEnd();

  return {
    flavorTests,
    optionalTests,
    summary: { total: allTests.length, passed, failed },
  };
}

/**
 * Print formatted report
 */
export function getTestReport(): string {
  const { flavorTests, optionalTests, summary } = runPizzaCalculationTests();
  
  let report = '# Pizza Calculation Tests Report\n\n';
  report += `Date: ${new Date().toISOString()}\n\n`;
  
  report += '## Flavor Pricing Models\n\n';
  flavorTests.forEach(t => {
    const status = t.passed ? '✅ PASS' : '❌ FAIL';
    report += `- ${status} ${t.name}\n`;
    if (t.details) report += `  - ${t.details}\n`;
  });
  
  report += '\n## Optional Calculation Modes\n\n';
  optionalTests.forEach(t => {
    const status = t.passed ? '✅ PASS' : '❌ FAIL';
    report += `- ${status} ${t.name}\n`;
    if (t.details) report += `  - ${t.details}\n`;
  });
  
  report += `\n---\n\n**Summary:** ${summary.passed}/${summary.total} tests passed\n`;
  
  return report;
}
