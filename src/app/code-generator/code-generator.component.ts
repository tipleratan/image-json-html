// src/app/components/code-generator/code-generator.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { CodeGeneratorService } from '../services/code-generator.service';

interface GeneratedCode {
    html: string;
    javascript: string;
    css: string;
}

@Component({
    selector: 'app-code-generator',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './code-generator.component.html',
    styleUrls: ['./code-generator.component.scss']
})
export class CodeGeneratorComponent {
    // 1. Inputs
    selectedJsonFile: File | null = null;
    userPrompt: string = 'Generate a responsive card component with a title, description, and an interactive button.';

    // 2. State
    isGenerating: boolean = false;
    generatedCode: GeneratedCode | null = null;
    errorMessage: string | null = null;

    constructor(private codeGenService: CodeGeneratorService) { }

    /**
     * Handles the dynamic JSON file selection from the input.
     * @param event The file input change event.
     */
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                this.selectedJsonFile = file;
                this.errorMessage = null;
            } else {
                this.selectedJsonFile = null;
                this.errorMessage = 'Please select a valid JSON file.';
            }
        }
    }

    /**
     * Main function to trigger the code generation process.
     */
    async generateAndDownloadCode() {
        if (!this.selectedJsonFile) {
            this.errorMessage = 'Please upload a dynamic JSON template file.';
            return;
        }

        this.isGenerating = true;
        this.errorMessage = null;
        this.generatedCode = null;

        try {
            const codeResult = await this.codeGenService.generateCodeFromTemplate(
                this.selectedJsonFile,
                this.userPrompt
            ).toPromise(); // Convert Observable to Promise for async/await

            this.generatedCode = codeResult as GeneratedCode; // Type assertion added
            if (this.generatedCode) {
                await this.createAndDownloadZip(this.generatedCode);
            } else {
                this.errorMessage = 'Generated code is undefined.';
            }

        } catch (error) {
            console.error('Code Generation Failed:', error);
            this.errorMessage = `Generation error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Compresses the generated code into a ZIP file and triggers a local download.
     * @param code The generated HTML, JS, and CSS.
     */
    private async createAndDownloadZip(code: GeneratedCode): Promise<void> {
        const zip = new JSZip();
        const folderName = 'gemini-generated-code';

        // Add the files to the zip folder
        zip.folder(folderName)?.file('index.html', code.html);
        zip.folder(folderName)?.file('script.js', code.javascript);
        zip.folder(folderName)?.file('style.css', code.css);

        // Generate the ZIP file blob
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Use file-saver to download the file locally
        saveAs(zipBlob, `${folderName}.zip`);
    }
}