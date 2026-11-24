import { Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface ShareInvoiceParams {
  saleId: string;
  invoiceNumber: string;
  businessName: string;
  pdfDownloadUrl: string;
  jwtToken: string;
  onAuditCallback?: (result: 'share_sheet_opened' | 'share_cancelled' | 'share_error') => Promise<void>;
}

/**
 * Servicio de Compartir Factura Digital mediante el Share Sheet nativo del SO
 * REEMPLAZO FORMAL DE WHATSAPP CLOUD API:
 * - Cero costos por mensaje de Meta
 * - No requiere registro mercantil ni cuenta en Meta Business Manager
 * - La aplicación móvil descarga el PDF a caché local y abre el diálogo nativo
 */
export class NativeShareService {
  static async shareInvoice(params: ShareInvoiceParams): Promise<{ success: boolean; action?: string }> {
    try {
      // 1. Ruta temporal local para el PDF
      const localPdfUri = `${FileSystem.cacheDirectory}factura_${params.invoiceNumber}.pdf`;

      // 2. Descargar el comprobante PDF desde la API de Vuelto
      const downloadRes = await FileSystem.downloadAsync(params.pdfDownloadUrl, localPdfUri, {
        headers: {
          Authorization: `Bearer ${params.jwtToken}`,
        },
      });

      if (downloadRes.status !== 200) {
        if (params.onAuditCallback) await params.onAuditCallback('share_error');
        throw new Error('No se pudo descargar el archivo PDF de la factura.');
      }

      // 3. Invocar Share Sheet Nativo del Sistema Operativo
      const shareResult = await Share.share(
        {
          title: `Factura ${params.invoiceNumber} - ${params.businessName}`,
          message: `Gracias por su compra en ${params.businessName}. Comprobante digital N° ${params.invoiceNumber}.`,
          url: Platform.OS === 'ios' ? localPdfUri : downloadRes.uri,
        },
        {
          dialogTitle: 'Compartir factura por WhatsApp u otra aplicación',
        }
      );

      // 4. Notificar auditoría de acuerdo a la acción del usuario
      if (shareResult.action === Share.sharedAction) {
        if (params.onAuditCallback) await params.onAuditCallback('share_sheet_opened');
        return { success: true, action: 'shared' };
      } else if (shareResult.action === Share.dismissedAction) {
        if (params.onAuditCallback) await params.onAuditCallback('share_cancelled');
        return { success: true, action: 'dismissed' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error abriendo Share Sheet nativo:', error);
      if (params.onAuditCallback) await params.onAuditCallback('share_error');
      return { success: false };
    }
  }
}
