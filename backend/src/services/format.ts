/** FCFA currency formatter, mirroring the mobile app. */
export function fcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}
