import fs from 'fs';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import csv from 'csv-parser';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { YoutubeTranscript } from 'youtube-transcript';

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
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return this.processYoutube(url);
    }

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

  private async processYoutube(url: string): Promise<string> {
    let content = '';
    
    // 1. Fetch Metadata (Title, Description)
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      const title = $('meta[property="og:title"]').attr('content') || $('title').text();
      const description = $('meta[property="og:description"]').attr('content') || '';
      
      if (title) content += `Title: ${title}\n\n`;
      if (description) content += `Description: ${description}\n\n`;
    } catch (e) {
      console.error('Error fetching YouTube metadata:', e);
    }

    // 2. Fetch Transcript
    try {
      // Try to fetch with English preference first
      let transcriptItems;
      try {
        transcriptItems = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });
      } catch (err) {
        // Fallback to default/auto
        console.warn('Failed to fetch English transcript, trying default:', err);
        transcriptItems = await YoutubeTranscript.fetchTranscript(url);
      }

      if (transcriptItems && transcriptItems.length > 0) {
        const transcriptText = transcriptItems.map(item => item.text).join(' ');
        content += `Transcript:\n${transcriptText}`;
      } else {
        content += '\n(No transcript available)';
      }
    } catch (error) {
      console.error('Error fetching YouTube transcript:', error);
      // Try Invidious as last resort fallback for transcript?
      // For now just note failure
      content += '\n(Transcript could not be fetched)';
    }

    if (!content.trim()) {
       throw new Error('Failed to extract any content from YouTube URL');
    }

    return content;
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
