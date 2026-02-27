const ExportService = require('../services/export_service');

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function parseParams(req) {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const companyId = req.query.company_id ? parseInt(req.query.company_id) : null;
  return { year, month, companyId };
}

class ExportController {
  async pdf(req, res) {
    try {
      const { year, month, companyId } = parseParams(req);
      const filename = `relatorio-${MONTH_NAMES[month - 1]}-${year}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const doc = await ExportService.generatePDF(year, month, req.userId, companyId);
      doc.pipe(res);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async excel(req, res) {
    try {
      const { year, month, companyId } = parseParams(req);
      const filename = `relatorio-${MONTH_NAMES[month - 1]}-${year}.xlsx`;

      const buffer = await ExportService.generateExcel(year, month, req.userId, companyId);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new ExportController();
