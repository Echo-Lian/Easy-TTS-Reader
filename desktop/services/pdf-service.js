/**
 * PDF Service — Extract text from PDF files using pdf-parse
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

class PdfService {
  /**
   * Extract text from a PDF file
   * @param {string} filePath - Absolute path to PDF
   * @returns {Promise<{text: string, pages: number, title: string}>}
   */
  async extract(filePath) {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);

    return {
      text: data.text || '',
      pages: data.numpages || 0,
      title: (data.info?.Title || path.basename(filePath, '.pdf')).trim(),
      metadata: data.info || {}
    };
  }

  /**
   * Extract text from a plain text file
   * @param {string} filePath
   * @returns {Promise<{text: string, pages: number, title: string}>}
   */
  async extractTextFile(filePath) {
    const text = await fs.readFile(filePath, 'utf-8');
    return {
      text,
      pages: 1,
      title: path.basename(filePath),
      metadata: {}
    };
  }

  /**
   * Detect file type and extract accordingly
   */
  async extractAny(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      return this.extract(filePath);
    }

    if (['.txt', '.md', '.html', '.htm', '.csv'].includes(ext)) {
      return this.extractTextFile(filePath);
    }

    throw new Error(`Unsupported file format: ${ext}. Please use PDF or text files.`);
  }

  /**
   * Split extracted text into chunks at sentence boundaries
   * @param {string} text
   * @param {number} maxChars - Max chars per chunk (~3000 for OpenAI TTS limit)
   * @returns {string[]}
   */
  chunkText(text, maxChars = 3000) {
    const chunks = [];
    let current = '';

    // Split by sentence endings
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];

    for (const sentence of sentences) {
      if ((current + sentence).length > maxChars && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [''];
  }
}

module.exports = PdfService;
