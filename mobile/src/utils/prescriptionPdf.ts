/**
 * PDF export of an ordonnance — see pdf.ts for the platform mechanics.
 */
import { Prescription } from '@/models/types';
import { exportHtmlAsPdf } from './pdf';
import { dayLabel, fullDate } from './format';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPrescriptionHtml(rx: Prescription): string {
  const lines = rx.lines
    .map(
      (l, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          <div class="med">${esc(l.name)} <span class="form">${esc(l.form)}</span></div>
          <div class="poso">
            ${[l.dosage, l.quantity, l.frequency, l.duration].filter(Boolean).map(esc).join(' · ')}
          </div>
          ${l.instructions ? `<div class="note">${esc(l.instructions)}</div>` : ''}
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1E2B28; margin: 0; }
  .band { background: #0E7D5B; color: #fff; border-radius: 10px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .brand small { display: block; font-size: 11px; font-weight: 400; opacity: 0.85; margin-top: 3px; }
  .code { background: rgba(255,255,255,0.16); border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 700; }
  .title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #0E7D5B; margin: 26px 0 10px; }
  .grid { display: flex; gap: 14px; }
  .box { flex: 1; border: 1px solid #DCE5E2; border-radius: 8px; padding: 12px 14px; }
  .box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7A8B87; margin-bottom: 4px; }
  .box .value { font-size: 13px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  tr { border-bottom: 1px solid #EDF2F0; }
  td { padding: 12px 4px; vertical-align: top; }
  td.num { width: 26px; font-weight: 800; color: #0E7D5B; }
  .med { font-size: 14px; font-weight: 700; }
  .form { font-size: 11px; color: #7A8B87; font-weight: 500; margin-left: 6px; }
  .poso { font-size: 12px; color: #54655F; margin-top: 3px; }
  .note { font-size: 11px; color: #1273A5; background: #EAF4FA; border-radius: 5px; padding: 5px 8px; margin-top: 6px; }
  .consignes { border-left: 3px solid #0E7D5B; background: #F2F8F5; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; line-height: 1.5; }
  .foot { margin-top: 26px; font-size: 10.5px; color: #8AA09A; text-align: center; line-height: 1.6; }
</style>
</head>
<body>
  <div class="band">
    <div class="brand">AuraHealth<small>Dossier médical — ordonnance</small></div>
    <div class="code">${esc(rx.code)}</div>
  </div>

  <div class="title">Prescription médicale</div>
  <div class="grid">
    <div class="box">
      <div class="label">Prescripteur</div>
      <div class="value">${esc(rx.doctorName)}</div>
      <div class="poso">${esc(rx.doctorSpecialty)} — ${esc(rx.establishment)}</div>
    </div>
    <div class="box">
      <div class="label">Patient</div>
      <div class="value">${esc(rx.patientName)}</div>
    </div>
  </div>
  <div class="grid" style="margin-top: 10px;">
    <div class="box">
      <div class="label">Date d'émission</div>
      <div class="value">${fullDate(rx.date)}</div>
    </div>
    <div class="box">
      <div class="label">Validité</div>
      <div class="value">${rx.status === 'active' ? `Jusqu'au ${dayLabel(rx.expiryDate)}` : 'Expirée'}</div>
    </div>
  </div>

  <div class="title">Traitements prescrits (${rx.lines.length})</div>
  <table>${lines}</table>

  ${
    rx.instructions
      ? `<div class="title">Consignes médicales</div><div class="consignes">${esc(rx.instructions)}</div>`
      : ''
  }

  <div class="foot">
    Ordonnance délivrée sur AuraHealth${rx.source === 'imported' ? ' (document importé)' : ''}.<br />
    Ce document ne remplace pas une consultation. En cas d'urgence, composez le 112.
  </div>
</body>
</html>`;
}

export async function downloadPrescriptionPdf(rx: Prescription): Promise<void> {
  await exportHtmlAsPdf(buildPrescriptionHtml(rx), `Ordonnance ${rx.code}`);
}
