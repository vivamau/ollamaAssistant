import fs from 'fs';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import csv from 'csv-parser';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export class DocumentProcessor {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService();
  }

  async processFile(filePath: string, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.processPDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.processDOCX(filePath);
      case 'text/csv':
        return this.processCSV(filePath);
      case 'text/markdown':
      case 'text/plain':
        return this.processText(filePath);
      case 'text/html':
        return this.processHTMLFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  async processUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, and other non-content elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('footer').remove();
    
    const content = $('body').html() || '';
    return this.turndownService.turndown(content);
  }

  private async processPDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  private async processDOCX(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async processCSV(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(JSON.stringify(results, null, 2));
        })
        .on('error', (error) => reject(error));
    });
  }

  private async processText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private async processHTMLFile(filePath: string): Promise<string> {
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    $('script').remove();
    $('style').remove();
    return this.turndownService.turndown($.html());
  }
}

export const documentProcessor = new DocumentProcessor();
