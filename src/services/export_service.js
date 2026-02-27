const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const TransactionService = require('./transaction_service');
const CompanyService = require('./company_service');

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatCurrency(value) {
  return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr) {
  const [year, month, day] = String(dateStr).split('-');
  return `${day}/${month}/${year}`;
}

async function buildReportData(year, month, userId, companyId) {
  const [transactions, summary] = await Promise.all([
    TransactionService.getMonthTransactions(year, month, userId, companyId || null),
    TransactionService.getMonthSummary(year, month, userId, companyId || null),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeRows = [];
  const expenseRows = [];

  for (const row of summary) {
    const amount = parseFloat(row.total);
    if (row.type === 'income') {
      totalIncome += amount;
      incomeRows.push({ category: row.category_name, total: amount });
    } else {
      totalExpense += amount;
      expenseRows.push({ category: row.category_name, total: amount });
    }
  }

  let label = 'Pessoal';
  if (companyId) {
    const company = await CompanyService.findById(companyId);
    label = company ? company.name : 'Empresa';
  }

  return { transactions, incomeRows, expenseRows, totalIncome, totalExpense, label };
}

class ExportService {
  // Retorna um stream do pdfkit para ser pipado na resposta HTTP
  async generatePDF(year, month, userId, companyId) {
    const { incomeRows, expenseRows, totalIncome, totalExpense, label } =
      await buildReportData(year, month, userId, companyId);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Título
    doc.fontSize(20).font('Helvetica-Bold').text('Relatório Financeiro', { align: 'center' });
    doc.fontSize(13).font('Helvetica').text(`${label} — ${MONTH_NAMES[month - 1]}/${year}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Receitas
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2e7d32').text('Entradas (Receitas)');
    doc.font('Helvetica').fillColor('#000000').fontSize(11);
    if (incomeRows.length === 0) {
      doc.text('  Nenhuma entrada registrada.');
    } else {
      for (const item of incomeRows) {
        doc.text(`  ${item.category}: ${formatCurrency(item.total)}`);
      }
    }
    doc.fontSize(12).font('Helvetica-Bold').text(`  Total: ${formatCurrency(totalIncome)}`);
    doc.moveDown();

    // Despesas
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#c62828').text('Saídas (Despesas)');
    doc.font('Helvetica').fillColor('#000000').fontSize(11);
    if (expenseRows.length === 0) {
      doc.text('  Nenhuma saída registrada.');
    } else {
      for (const item of expenseRows) {
        doc.text(`  ${item.category}: ${formatCurrency(item.total)}`);
      }
    }
    doc.fontSize(12).font('Helvetica-Bold').text(`  Total: ${formatCurrency(totalExpense)}`);
    doc.moveDown();

    // Saldo
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    const balance = totalIncome - totalExpense;
    const balanceColor = balance >= 0 ? '#2e7d32' : '#c62828';
    const sign = balance >= 0 ? '+' : '-';
    doc.fontSize(15).font('Helvetica-Bold').fillColor(balanceColor)
      .text(`Saldo do mês: ${sign} ${formatCurrency(Math.abs(balance))}`, { align: 'center' });

    doc.end();
    return doc;
  }

  // Retorna um buffer Excel
  async generateExcel(year, month, userId, companyId) {
    const { transactions, incomeRows, expenseRows, totalIncome, totalExpense, label } =
      await buildReportData(year, month, userId, companyId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestão Financeira';

    // === Aba 1: Transações ===
    const sheet1 = workbook.addWorksheet('Transações');
    sheet1.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Descrição', key: 'description', width: 30 },
      { header: 'Valor (R$)', key: 'amount', width: 15 },
    ];

    // Estilo do cabeçalho
    sheet1.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.alignment = { horizontal: 'center' };
    });

    for (const tx of transactions) {
      sheet1.addRow({
        date: formatDate(tx.date),
        type: tx.type === 'income' ? 'Receita' : 'Despesa',
        category: tx.category?.name || '',
        description: tx.description || '',
        amount: parseFloat(tx.amount),
      });
    }

    // Formata coluna de valor
    sheet1.getColumn('amount').numFmt = '#,##0.00';

    // Zebra striping
    sheet1.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowNumber % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF' },
          };
        });
      }
    });

    // === Aba 2: Resumo ===
    const sheet2 = workbook.addWorksheet('Resumo');
    sheet2.columns = [
      { header: 'Tipo', key: 'type', width: 14 },
      { header: 'Categoria', key: 'category', width: 25 },
      { header: 'Total (R$)', key: 'total', width: 15 },
    ];

    sheet2.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.alignment = { horizontal: 'center' };
    });

    for (const item of incomeRows) {
      sheet2.addRow({ type: 'Receita', category: item.category, total: item.total });
    }
    sheet2.addRow({ type: '', category: 'TOTAL RECEITAS', total: totalIncome })
      .getCell('total').font = { bold: true, color: { argb: 'FF2E7D32' } };

    sheet2.addRow({});

    for (const item of expenseRows) {
      sheet2.addRow({ type: 'Despesa', category: item.category, total: item.total });
    }
    sheet2.addRow({ type: '', category: 'TOTAL DESPESAS', total: totalExpense })
      .getCell('total').font = { bold: true, color: { argb: 'FFC62828' } };

    sheet2.addRow({});

    const balance = totalIncome - totalExpense;
    const balanceRow = sheet2.addRow({ type: '', category: 'SALDO DO MÊS', total: balance });
    balanceRow.getCell('total').font = {
      bold: true,
      color: { argb: balance >= 0 ? 'FF2E7D32' : 'FFC62828' },
    };

    sheet2.getColumn('total').numFmt = '#,##0.00';

    // Título da aba de resumo
    sheet2.spliceRows(1, 0, [`Relatório — ${label} — ${MONTH_NAMES[month - 1]}/${year}`]);
    sheet2.getCell('A1').font = { bold: true, size: 14 };
    sheet2.mergeCells('A1:C1');

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = new ExportService();
