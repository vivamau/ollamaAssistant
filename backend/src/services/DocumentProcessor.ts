import fs from 'fs';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import csv from 'csv-parser';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { Innertube, UniversalCache } from 'youtubei.js';
import ExcelJS from 'exceljs';

export class DocumentProcessor {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService();
  }

  async processFile(filePath: string, mimeType: string): Promise<string> {
    // Handle CSV MIME type variations
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    // Normalize MIME type for CSV files
    if (mimeType === 'text/csv' || mimeType === 'application/csv' || 
        mimeType === 'application/vnd.ms-excel' && fileExtension === 'csv') {
      return this.processCSV(filePath);
    }
    
    switch (mimeType) {
      case 'application/pdf':
        return this.processPDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.processDOCX(filePath);
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return this.processExcel(filePath);
      case 'application/vnd.ms-excel':
        // Check extension to differentiate between .xls and .csv
        if (fileExtension === 'xls' || fileExtension === 'xlsx') {
          return this.processExcel(filePath);
        }
        return this.processCSV(filePath);
      case 'text/markdown':
      case 'text/plain':
        return this.processText(filePath);
      case 'text/html':
        return this.processHTMLFile(filePath);
      default:
        // Fallback to extension-based detection
        if (fileExtension === 'csv') return this.processCSV(filePath);
        if (fileExtension === 'xlsx' || fileExtension === 'xls') return this.processExcel(filePath);
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
    
    console.log('Processing YouTube URL:', url);
    
    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }
    
    console.log('Extracted video ID:', videoId);
    
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
      
      console.log('YouTube metadata fetched:', { title, descriptionLength: description.length });
    } catch (e) {
      console.error('Error fetching YouTube metadata:', e);
    }

    // 2. Fetch Transcript/Captions
    try {
      console.log('Attempting to fetch video info for ID:', videoId);
      
      const youtube = await Innertube.create({ 
        cache: new UniversalCache(false),
        generate_session_locally: true
      });
      
      const info = await youtube.getInfo(videoId);
      
      try {
             const transcriptData = await info.getTranscript();
             console.log('Transcript data found');
             
             if (transcriptData?.transcript?.content?.body?.initial_segments) {
               const segments = transcriptData.transcript.content.body.initial_segments;
               const text = segments.map((seg: any) => seg.snippet.text).join(' ');
               
               if (text) {
                 content += `Transcript:\n${text}`;
                 console.log('Transcript added to content, length:', text.length);
               } else {
                 console.warn('Transcript segments found but no text extracted');
                 content += '\n(No transcript text available)';
               }
             } else {
               console.warn('Transcript data structure not matching expected format');
               content += '\n(No transcript available)';
             }
      } catch (transcriptError: any) {
        console.warn('Could not retrieve transcript directly:', transcriptError.message);
        content += '\n(No transcript available)';
      }

    } catch (error: any) {
      console.error('Error fetching YouTube info/transcript:', error.message);
      content += '\n(Transcript could not be fetched)';
    }

    if (!content.trim()) {
       console.error('No content extracted from YouTube URL');
       throw new Error('Failed to extract any content from YouTube URL');
    }

    console.log('YouTube processing complete, total content length:', content.length);
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

  private async processExcel(filePath: string): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    let content = '';
    
    workbook.eachSheet((worksheet, sheetId) => {
      if (sheetId > 1) content += '\n\n';
      content += `Sheet: ${worksheet.name}\n`;
      
      const rows: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowData: any[] = [];
        row.eachCell((cell, colNumber) => {
          rowData.push(cell.value);
        });
        rows.push(rowData);
      });
      
      content += JSON.stringify(rows, null, 2);
    });
    
    return content;
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
