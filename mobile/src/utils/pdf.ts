/**
 * Renders an HTML document as a PDF the user can keep.
 * - Web: printed from a hidden iframe — the browser dialog offers
 *   « Enregistrer au format PDF ».
 * - Native: expo-print produces a real PDF file, handed to the share sheet
 *   (save to Files / Drive / email…).
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportHtmlAsPdf(html: string, title: string): Promise<void> {
  if (Platform.OS === 'web') {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.srcdoc = html;
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Leave a beat before removing: Chrome tears down the print job if the
      // frame disappears synchronously.
      setTimeout(() => iframe.remove(), 60_000);
    };
    document.body.appendChild(iframe);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: title,
      UTI: 'com.adobe.pdf',
    });
  }
}
