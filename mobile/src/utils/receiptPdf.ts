/**
 * PDF export of a payment receipt — see pdf.ts for the platform mechanics.
 */
import { Payment } from '@/models/types';
import { exportHtmlAsPdf } from './pdf';
import { fullDate } from './format';

const methodLabels: Record<Payment['method'], string> = {
  mtn_momo: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
};

const categoryLabels: Record<Payment['category'], string> = {
  consultation: 'Paiement de consultation',
  medkit: 'Achat de médicaments',
  order: 'Commande pharmacie',
};

const statusLabels: Record<Payment['status'], string> = {
  paid: 'Payé',
  pending: 'En attente',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

export function buildReceiptHtml(payment: Payment): string {
  const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
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
  .ref { background: rgba(255,255,255,0.16); border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 700; }
  .amount-card { border: 1px solid #DCE5E2; border-radius: 10px; text-align: center; padding: 22px; margin-top: 22px; }
  .amount { font-size: 34px; font-weight: 800; }
  .label { font-size: 13px; color: #54655F; margin-top: 6px; }
  .status { display: inline-block; border-radius: 999px; padding: 6px 16px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; background: #E7F5EF; color: #0E7D5B; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; }
  td { padding: 11px 4px; border-bottom: 1px solid #EDF2F0; font-size: 13px; vertical-align: top; }
  td.k { color: #7A8B87; width: 45%; }
  td.v { text-align: right; font-weight: 600; }
  .foot { margin-top: 26px; font-size: 10.5px; color: #8AA09A; text-align: center; line-height: 1.6; }
</style>
</head>
<body>
  <div class="band">
    <div class="brand">AuraHealth<small>Reçu de paiement</small></div>
    <div class="ref">${payment.reference}</div>
  </div>

  <div class="amount-card">
    <div class="amount">${fcfa(payment.amount)}</div>
    <div class="label">${payment.label}</div>
    <div class="status">${statusLabels[payment.status] ?? payment.status}</div>
  </div>

  <table>
    <tr><td class="k">Type</td><td class="v">${categoryLabels[payment.category] ?? payment.category}</td></tr>
    <tr><td class="k">Date et heure</td><td class="v">${fullDate(payment.date)} à ${payment.time}</td></tr>
    <tr><td class="k">Moyen de paiement</td><td class="v">${methodLabels[payment.method] ?? payment.method}</td></tr>
    <tr><td class="k">Référence transaction</td><td class="v">${payment.reference}</td></tr>
  </table>

  <div class="foot">
    Ce reçu constitue une preuve de paiement pour la transaction ci-dessus.<br />
    Une question ? Contactez le support AuraHealth depuis « Profil › Aide et assistance ».
  </div>
</body>
</html>`;
}

export async function downloadReceiptPdf(payment: Payment): Promise<void> {
  await exportHtmlAsPdf(buildReceiptHtml(payment), `Reçu ${payment.reference}`);
}
