import type { DREAdvancedData } from '../hooks/useERPDREAdvanced';

export function exportDREToCSV(data: DREAdvancedData, filename: string) {
  const lines: string[] = [
    'DEMONSTRATIVO DE RESULTADOS DO EXERCÍCIO (DRE)',
    `Período: ${data.period}`,
    '',
    'DESCRIÇÃO;VALOR;% RECEITA LÍQUIDA',
    '',
    '=== RECEITAS ===',
    `Receita Bruta;${formatCurrency(data.receita_bruta)};`,
    `(-) Descontos;${formatCurrency(-data.descontos)};`,
    `(+) Taxas de Delivery;${formatCurrency(data.taxas_delivery)};`,
    `= Receita Líquida;${formatCurrency(data.receita_liquida)};100%`,
    '',
    '=== CUSTOS ===',
    `(-) Custo da Mercadoria Vendida (CMV);${formatCurrency(-data.cmv)};${formatPercent(data.receita_liquida > 0 ? (data.cmv / data.receita_liquida) * 100 : 0)}`,
    `= Lucro Bruto;${formatCurrency(data.lucro_bruto)};${formatPercent(data.margem_bruta_percent)}`,
    '',
    '=== DESPESAS OPERACIONAIS ===',
  ];

  data.despesas_por_categoria.forEach(cat => {
    lines.push(`(-) ${cat.category_name};${formatCurrency(-cat.amount)};${formatPercent(data.receita_liquida > 0 ? (cat.amount / data.receita_liquida) * 100 : 0)}`);
  });

  lines.push(`= Total Despesas Operacionais;${formatCurrency(-data.total_despesas_operacionais)};${formatPercent(data.receita_liquida > 0 ? (data.total_despesas_operacionais / data.receita_liquida) * 100 : 0)}`);
  lines.push('');
  lines.push('=== RESULTADO ===');
  lines.push(`= Resultado Operacional;${formatCurrency(data.resultado_operacional)};${formatPercent(data.margem_operacional_percent)}`);
  lines.push(`(+) Outras Receitas;${formatCurrency(data.outras_receitas)};`);
  lines.push(`(-) Outras Despesas;${formatCurrency(-data.outras_despesas)};`);
  lines.push(`= RESULTADO FINAL (LUCRO/PREJUÍZO);${formatCurrency(data.resultado_final)};${formatPercent(data.margem_liquida_percent)}`);

  const csv = lines.join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export function exportDREToPrint(data: DREAdvancedData) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DRE - ${data.period}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; margin-bottom: 5px; }
        h3 { text-align: center; color: #666; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
        .section { background-color: #e8e8e8; font-weight: bold; }
        .total { font-weight: bold; background-color: #f0f0f0; }
        .result-positive { color: green; font-weight: bold; }
        .result-negative { color: red; font-weight: bold; }
        .align-right { text-align: right; }
        .indent { padding-left: 30px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>DEMONSTRATIVO DE RESULTADOS DO EXERCÍCIO</h1>
      <h3>Período: ${data.period}</h3>
      
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="align-right">Valor (R$)</th>
            <th class="align-right">% Rec. Líquida</th>
          </tr>
        </thead>
        <tbody>
          <tr class="section"><td colspan="3">RECEITAS</td></tr>
          <tr>
            <td class="indent">Receita Bruta</td>
            <td class="align-right">${formatCurrency(data.receita_bruta)}</td>
            <td class="align-right">-</td>
          </tr>
          <tr>
            <td class="indent">(-) Descontos</td>
            <td class="align-right">${formatCurrency(-data.descontos)}</td>
            <td class="align-right">-</td>
          </tr>
          <tr>
            <td class="indent">(+) Taxas de Delivery</td>
            <td class="align-right">${formatCurrency(data.taxas_delivery)}</td>
            <td class="align-right">-</td>
          </tr>
          <tr class="total">
            <td>= Receita Líquida</td>
            <td class="align-right">${formatCurrency(data.receita_liquida)}</td>
            <td class="align-right">100%</td>
          </tr>
          
          <tr class="section"><td colspan="3">CUSTOS</td></tr>
          <tr>
            <td class="indent">(-) Custo da Mercadoria Vendida (CMV)</td>
            <td class="align-right">${formatCurrency(-data.cmv)}</td>
            <td class="align-right">${formatPercent(data.receita_liquida > 0 ? (data.cmv / data.receita_liquida) * 100 : 0)}</td>
          </tr>
          <tr class="total">
            <td>= Lucro Bruto</td>
            <td class="align-right">${formatCurrency(data.lucro_bruto)}</td>
            <td class="align-right">${formatPercent(data.margem_bruta_percent)}</td>
          </tr>
          
          <tr class="section"><td colspan="3">DESPESAS OPERACIONAIS</td></tr>
          ${data.despesas_por_categoria.map(cat => `
            <tr>
              <td class="indent">(-) ${cat.category_name}</td>
              <td class="align-right">${formatCurrency(-cat.amount)}</td>
              <td class="align-right">${formatPercent(data.receita_liquida > 0 ? (cat.amount / data.receita_liquida) * 100 : 0)}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td>= Total Despesas Operacionais</td>
            <td class="align-right">${formatCurrency(-data.total_despesas_operacionais)}</td>
            <td class="align-right">${formatPercent(data.receita_liquida > 0 ? (data.total_despesas_operacionais / data.receita_liquida) * 100 : 0)}</td>
          </tr>
          
          <tr class="section"><td colspan="3">RESULTADO</td></tr>
          <tr class="total">
            <td>= Resultado Operacional</td>
            <td class="align-right">${formatCurrency(data.resultado_operacional)}</td>
            <td class="align-right">${formatPercent(data.margem_operacional_percent)}</td>
          </tr>
          <tr>
            <td class="indent">(+) Outras Receitas</td>
            <td class="align-right">${formatCurrency(data.outras_receitas)}</td>
            <td class="align-right">-</td>
          </tr>
          <tr>
            <td class="indent">(-) Outras Despesas</td>
            <td class="align-right">${formatCurrency(-data.outras_despesas)}</td>
            <td class="align-right">-</td>
          </tr>
          <tr class="total ${data.resultado_final >= 0 ? 'result-positive' : 'result-negative'}">
            <td>= RESULTADO FINAL (${data.resultado_final >= 0 ? 'LUCRO' : 'PREJUÍZO'})</td>
            <td class="align-right">${formatCurrency(data.resultado_final)}</td>
            <td class="align-right">${formatPercent(data.margem_liquida_percent)}</td>
          </tr>
        </tbody>
      </table>
      
      <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
        Gerado em ${new Date().toLocaleString('pt-BR')}
      </p>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
