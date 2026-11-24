export interface CreatePaymentIntentParams {
  tenantId: string;
  amountBs: number;
  customerDocType: string;
  customerDocNumber: string;
  customerPhone: string;
  referenceId: string;
  description: string;
}

export interface PaymentIntentResult {
  intentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentUrl?: string;
  amountBs: number;
  expiresAt: Date;
}

export interface VueltoPagoMovilParams {
  tenantId: string;
  amountBs: number;
  destinationBankCode: string;
  destinationPhone: string;
  destinationDocType: string;
  destinationDocNumber: string;
  saleId: string;
}

export interface VueltoPagoMovilResult {
  success: boolean;
  referenceNumber: string;
  amountBs: number;
  timestamp: Date;
}

export interface PaymentGateway {
  name: string;
  
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): boolean;
  
  checkPaymentStatus(intentId: string): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; referenceNumber?: string }>;
  
  sendVueltoPagoMovil(params: VueltoPagoMovilParams): Promise<VueltoPagoMovilResult>;
}
