import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { currencyFormatter } from './formatUtils';

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDateLabel(value) {
  const raw = String(value || '').slice(0, 10);

  if (!raw) {
    return '—';
  }

  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) {
    return raw;
  }

  return shortDateFormatter.format(new Date(year, month - 1, day));
}

function drawMetricCard(doc, x, y, width, height, label, value) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 10, 10, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 84, 103);
  doc.text(label.toUpperCase(), x + 14, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 24, 40);
  doc.text(String(value), x + 14, y + 40);
}

export function exportReportToPdf({
  fechaInicio,
  fechaFin,
  typeFilter,
  search,
  kpis,
  rows,
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const cardGap = 12;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const cardHeight = 58;

  const visibleTotal = rows.reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const visibleClients = new Set(rows.map((item) => item.client_id).filter(Boolean)).size;
  const generatedAt = dateTimeFormatter.format(new Date());
  const searchLabel = search?.trim() ? search.trim() : 'Sin filtro';
  const typeLabel = typeFilter && typeFilter !== 'todos' ? typeFilter : 'Todos';

  doc.setFillColor(16, 24, 40);
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Reporte Ejecutivo', margin, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Sistema de Gestion Migratoria  |  Generado ${generatedAt}`, margin, 60);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 100, contentWidth, 56, 12, 12, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 24, 40);
  doc.text(`Periodo: ${formatDateLabel(fechaInicio)} - ${formatDateLabel(fechaFin)}`, margin + 16, 123);
  doc.text(`Tipo: ${typeLabel}`, margin + 16, 142);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 84, 103);
  doc.text(`Busqueda: ${searchLabel}`, margin + 190, 123);
  doc.text(`Movimientos exportados: ${rows.length}`, margin + 190, 142);
  doc.text(`Clientes con movimiento: ${visibleClients}`, margin + 390, 123);
  doc.text(`Monto visible: ${currencyFormatter.format(visibleTotal)}`, margin + 390, 142);

  let currentY = 176;

  drawMetricCard(doc, margin, currentY, cardWidth, cardHeight, 'Ingreso total', currencyFormatter.format(kpis.ingreso_total || 0));
  drawMetricCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Egreso total', currencyFormatter.format(kpis.egreso_total || 0));
  drawMetricCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Balance general', currencyFormatter.format(kpis.balance_general || 0));

  currentY += cardHeight + cardGap;

  drawMetricCard(doc, margin, currentY, cardWidth, cardHeight, 'Abonos totales', currencyFormatter.format(kpis.abonos_totales || 0));
  drawMetricCard(doc, margin + cardWidth + cardGap, currentY, cardWidth, cardHeight, 'Saldo restante', currencyFormatter.format(kpis.saldo_restante || 0));
  drawMetricCard(doc, margin + (cardWidth + cardGap) * 2, currentY, cardWidth, cardHeight, 'Tramites del periodo', String(kpis.tramites_mensuales || 0));

  currentY += cardHeight + 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 24, 40);
  doc.text('Detalle de movimientos', margin, currentY);

  autoTable(doc, {
    startY: currentY + 12,
    margin: { left: margin, right: margin, bottom: 32 },
    head: [['Fecha', 'Tipo', 'Concepto', 'Cliente', 'Forma de pago', 'Monto']],
    body: rows.map((item) => [
      formatDateLabel(item.fecha),
      item.tipo ? String(item.tipo).toUpperCase() : '—',
      item.concepto || '—',
      item.cliente_nombre || 'General',
      item.forma_pago || 'No especificado',
      currencyFormatter.format(Number(item.monto || 0)),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 8,
      lineColor: [226, 232, 240],
      lineWidth: 0.6,
      textColor: [16, 24, 40],
    },
    headStyles: {
      fillColor: [16, 24, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      5: { halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      const pageNumber = doc.getNumberOfPages();

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Sistema de Gestion Migratoria', margin, pageHeight - 10);
      doc.text(`Pagina ${pageNumber}`, pageWidth - margin - 46, pageHeight - 10);
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`reporte_ejecutivo_${fechaInicio}_${fechaFin}.pdf`);
}
