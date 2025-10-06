import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GeminiService } from './services/gemini.service';
import { CodeGeneratorComponent } from "./code-generator/code-generator.component";
import { finalize } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
declare const bootstrap: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CodeGeneratorComponent, MatProgressBarModule],
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
  // --- New State Variables ---
  /** True when the PDF is being processed. Controls visibility of the progress bar. */
  isProcessing: boolean = false;
  /** The current percentage of progress (0-100). */
  progress: number = 0;
  private progressInterval: any; // Used to hold the interval reference for cleanup

  // Assuming you have your service injected
  // constructor(private geminiService: GeminiService) {} 
  // ... and other necessary properties like 'pdfFile'
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
    }
  }


  // --- Progress Simulation Logic (Crucial for UI Feedback) ---
  /**
   * Simulates progress when true percentage isn't available from the backend.
   * NOTE: In a real-world scenario with *true* streaming progress, 
   * this would be replaced by updates from the backend.
   */
  private startProgressSimulation() {
    // Clear any existing interval just in case
    this.stopProgressSimulation();

    // Simulate progress every 150ms
    this.progressInterval = setInterval(() => {
      // Increment progress but slow down as it gets closer to completion 
      // (a common UX pattern to manage expectation)
      if (this.progress < 90) {
        this.progress += Math.floor(Math.random() * 5) + 1; // Faster at the start
      } else if (this.progress < 98) {
        this.progress += 1; // Slower near the end
      }

      // Cap the progress at 98% to wait for the actual API call to complete
      if (this.progress >= 98) {
        this.progress = 98;
      }
    }, 150);
  }

  /**
   * Stops the progress simulation interval.
   */
  private stopProgressSimulation() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }


  // --- Modified processPdf() Function ---
  processWithProgressBar() {
    if (!this.pdfFile) return;

    // 1. Start the UI processing state and progress simulation
    this.isProcessing = true;
    this.progress = 0;
    this.startProgressSimulation();

    const prompt = "Extract all fields and return a JSON object with proper keys.";

    // 2. Call the service and use 'finalize' to handle completion/error
    this.geminiService.generateContentFromImage(prompt, this.pdfFile)
      .pipe(
        // 'finalize' executes when the Observable completes or errors
        finalize(() => {
          this.stopProgressSimulation();
          // Ensure it shows 100% just before hiding
          this.progress = 100;

          // Optional: A small delay before hiding for a smooth finish
          setTimeout(() => {
            this.isProcessing = false;
          }, 500);
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Generated JSON:', result);
          // Handle successful result
        },
        error: (err) => {
          console.error('Processing Error:', err);
          // Handle error (e.g., show error message)
        }
      });
  }
}