/**
 * UAZAPI Integration Service
 * Documentation: https://docs.uazapi.com/
 */

export interface UazapiConfig {
  baseUrl: string;
  instanceId: string;
  apiKey: string;
}

export interface SendMessageParams {
  phone: string;
  message: string;
  quotedMsgId?: string;
}

export interface SendMediaParams {
  phone: string;
  mediaUrl: string;
  caption?: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
}

export interface WebhookPayload {
  event: string;
  instanceId: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      imageMessage?: {
        url: string;
        caption?: string;
      };
      audioMessage?: {
        url: string;
      };
      documentMessage?: {
        url: string;
        fileName?: string;
      };
    };
    messageTimestamp?: number;
  };
}

export class UazapiService {
  private baseUrl: string;
  private instanceId: string;
  private apiKey: string;

  constructor(config: UazapiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.instanceId = config.instanceId;
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`UAZAPI Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Format phone number to WhatsApp format
  private formatPhone(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Add @s.whatsapp.net suffix
    return `${digits}@s.whatsapp.net`;
  }

  // Send text message
  async sendText(params: SendMessageParams): Promise<{ key: { id: string } }> {
    return this.request(`/message/sendText/${this.instanceId}`, {
      method: 'POST',
      body: JSON.stringify({
        number: this.formatPhone(params.phone),
        text: params.message,
        ...(params.quotedMsgId && { quoted: { key: { id: params.quotedMsgId } } }),
      }),
    });
  }

  // Send media (image, video, audio, document)
  async sendMedia(params: SendMediaParams): Promise<{ key: { id: string } }> {
    const endpoint = `/message/send${params.mediaType.charAt(0).toUpperCase() + params.mediaType.slice(1)}/${this.instanceId}`;
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        number: this.formatPhone(params.phone),
        mediaUrl: params.mediaUrl,
        caption: params.caption || '',
      }),
    });
  }

  // Check instance connection status
  async getStatus(): Promise<{ state: string; connected: boolean }> {
    return this.request(`/instance/connectionState/${this.instanceId}`);
  }

  // Get QR Code for connection
  async getQrCode(): Promise<{ qrcode: string }> {
    return this.request(`/instance/qrcode/${this.instanceId}`);
  }

  // Disconnect instance
  async disconnect(): Promise<{ success: boolean }> {
    return this.request(`/instance/logout/${this.instanceId}`, { method: 'DELETE' });
  }

  // Parse incoming webhook message
  static parseWebhookMessage(payload: WebhookPayload): {
    phone: string;
    name: string;
    text: string;
    messageId: string;
    isFromMe: boolean;
  } | null {
    if (payload.event !== 'messages.upsert') return null;

    const { data } = payload;
    const phone = data.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
    const name = data.pushName || phone;
    const messageId = data.key.id;
    const isFromMe = data.key.fromMe;

    // Extract text from different message types
    let text = '';
    if (data.message?.conversation) {
      text = data.message.conversation;
    } else if (data.message?.extendedTextMessage?.text) {
      text = data.message.extendedTextMessage.text;
    } else if (data.message?.imageMessage?.caption) {
      text = `[Imagem] ${data.message.imageMessage.caption}`;
    } else if (data.message?.audioMessage) {
      text = '[Áudio recebido]';
    } else if (data.message?.documentMessage) {
      text = `[Documento: ${data.message.documentMessage.fileName || 'arquivo'}]`;
    }

    if (!text && !isFromMe) return null;

    return { phone, name, text, messageId, isFromMe };
  }
}

// Factory function to create service from channel credentials
export function createUazapiService(credentials: {
  api_key?: string;
  instance_id?: string;
  base_url?: string;
}): UazapiService | null {
  if (!credentials.api_key || !credentials.instance_id) return null;
  
  return new UazapiService({
    baseUrl: credentials.base_url || 'https://api.uazapi.com',
    instanceId: credentials.instance_id,
    apiKey: credentials.api_key,
  });
}

