/**
 * Document Processor Service
 * Parses PDFs, Excel, Word documents and extracts text
 */

import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export interface ProcessedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    wordCount: number;
    format: string;
  };
}

/**
 * Parse PDF buffer and extract text
 */
export async function parsePDF(buffer: Buffer): Promise<ProcessedDocument> {
  const data = await pdf(buffer);
  return {
    text: data.text,
    metadata: {
      pageCount: data.numpages,
      wordCount: data.text.split(/\s+/).filter(Boolean).length,
      format: 'pdf',
    },
  };
}

/**
 * Parse Excel/CSV file and extract text
 */
export function parseSpreadsheet(buffer: Buffer, fileName: string): ProcessedDocument {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`## Sheet: ${sheetName}\n\n${csv}`);
  }

  const text = sheets.join('\n\n---\n\n');

  return {
    text,
    metadata: {
      sheetCount: workbook.SheetNames.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      format: fileName.endsWith('.csv') ? 'csv' : 'excel',
    },
  };
}

/**
 * Parse Word document and extract text
 */
export async function parseWord(buffer: Buffer): Promise<ProcessedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).filter(Boolean).length,
      format: 'docx',
    },
  };
}

/**
 * Process any supported document type
 */
export async function processDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ProcessedDocument> {
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return parsePDF(buffer);
  }

  // Excel
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) {
    return parseSpreadsheet(buffer, fileName);
  }

  // CSV
  if (mimeType === 'text/csv' || ext === 'csv') {
    return parseSpreadsheet(buffer, fileName);
  }

  // Word
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return parseWord(buffer);
  }

  // Plain text
  if (mimeType.startsWith('text/') || ext === 'txt' || ext === 'md') {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        format: ext || 'text',
      },
    };
  }

  throw new Error(`Unsupported file type: ${mimeType} (${ext})`);
}

/**
 * Split text into chunks for embedding
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

