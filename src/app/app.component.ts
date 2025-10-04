import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { GeminiService } from './services/gemini.service';
import { DynamicFormGeneratorComponent } from "./dynamic-form/dynamic-form.component";
import { CodeGeneratorComponent } from "./code-generator/code-generator.component";

declare const bootstrap: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicFormGeneratorComponent, CodeGeneratorComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  pdfFile: File | null = null;
  clonedPdfBytes: Uint8Array | null = null;
  cloneReady = false;
  pdfPreviewUrl: SafeResourceUrl | null = null;
  showDownloadSection = false;
  fileName: string = 'cloned-document';
  codeText: string = '';
  isMalicious: boolean = false;
  userInput: string = 'Play a role as document reader having 15 years of experience to read content into PDF attached files.'
    + ' And answer the question base on contents into PDF files.'
    + ' Kindly read every field labels define into PDF files with its values. User can edit its values if he/she wants.';
  response: string = '';
  constructor(private sanitizer: DomSanitizer, private geminiService: GeminiService) { }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pdfFile = input.files[0];
      this.cloneReady = false;
      this.showDownloadSection = false;

      const blobUrl = URL.createObjectURL(this.pdfFile);
      this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

      // Verificar conteúdo malicioso
      //this.checkForMaliciousCode(this.pdfFile);
    }
  }

  async checkForMaliciousCode(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);

    const maliciousPatterns = /\/JavaScript|\/JS|eval|app\.alert|Launch|Action/i;

    this.isMalicious = maliciousPatterns.test(text);
  }

  async clonePdf() {
    if (!this.pdfFile || this.isMalicious) return;

    const arrayBuffer = await this.pdfFile.arrayBuffer();
    const originalPdf = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    const pages = await newPdf.copyPages(originalPdf, originalPdf.getPageIndices());
    pages.forEach((page) => newPdf.addPage(page));

    if (this.codeText.trim()) {
      const page = newPdf.addPage([600, 800]);
      const font = await newPdf.embedFont(StandardFonts.Courier);
      const fontSize = 12;
      const margin = 20;

      const lines = this.codeText.split('\n');
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: margin,
          y: page.getHeight() - margin - fontSize * (index + 1),
          size: fontSize,
          font,
        });
      });
    }

    this.clonedPdfBytes = await newPdf.save();
    this.cloneReady = true;
    this.showDownloadSection = true;
  }

  openRenameModal() {
    const modalElement = document.getElementById('renameModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  processPdf() {
    if (!this.pdfFile) return;

    const prompt = "Extract all fields and return a JSON object with proper keys.";
    this.geminiService.generateContentFromImage(prompt, this.pdfFile)
      .subscribe(result => {
        console.log('Generated JSON:', result);
      });
  }

  async ReadPDF() {

    const newPdf = await PDFDocument.create();
    if (!this.pdfFile || this.isMalicious) return;
    const arrayBuffer = await this.pdfFile.arrayBuffer();
    const originalPdf = await PDFDocument.load(arrayBuffer);
    this.geminiService.generateContent(this.userInput).subscribe(res => {
      this.response = res?.candidates?.[0]?.content?.parts?.[0]?.text + { originalPdf } || 'No response';
      this.codeText = this.userInput;
    });

    if (this.codeText.trim()) {
      const page = newPdf.addPage([600, 800]);
      const font = await newPdf.embedFont(StandardFonts.Courier);
      const fontSize = 12;
      const margin = 20;

      const lines = this.codeText.split('\n');
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: margin,
          y: page.getHeight() - margin - fontSize * (index + 1),
          size: fontSize,
          font,
        });
      });
    }

  }

  confirmDownload() {
    if (!this.clonedPdfBytes) return;

    const safeFileName = this.fileName.trim() || 'document';
    const blob = new Blob([this.clonedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}