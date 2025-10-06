// src/app/services/code-generator.service.ts
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environment';
import { GoogleGenAI, GenerateContentParameters } from '@google/genai';
// Define the expected output structure for type safety
interface GeneratedCode {
    html: string;
    javascript: string;
    css: string;
}

@Injectable({
    providedIn: 'root'
})
export class CodeGeneratorService {
    private ai: GoogleGenAI;
    private readonly model = 'gemini-2.5-flash'; // Great balance of speed and capability for code generation

    constructor() {
        // Initializes the Gemini AI client. Use a secure backend proxy in a production application!
        this.ai = new GoogleGenAI({ apiKey: environment.geminiApiKey });
    }

    /**
     * Utility to read a JSON file and return its content as a string.
     * @param file The uploaded JSON file.
     * @returns A Promise resolving to the file content string.
     */
    private readFileContent(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Generates HTML, JS, and CSS code from a dynamic JSON template and a prompt.
     * @param jsonFile The dynamically uploaded JSON file.
     * @param prompt A description of the desired output (e.g., "Create a dashboard view").
     * @returns An Observable of the GeneratedCode object.
     */
    public generateCodeFromTemplate(jsonFile: File, prompt: string): Observable<GeneratedCode> {
        // 1. Read the dynamic JSON file content
        const fileReadObservable = from(this.readFileContent(jsonFile));

        return fileReadObservable.pipe(
            // 2. Map the JSON string to the Gemini API call
            switchMap(async (jsonContent) => {
                const fullPrompt = `
                Play a role as web designer software developer from MIT (
                    Massachusetts Institute of Technology) having 15 years of experience into html, js and css dynamically.
                    Kindly find attached JSON object template and generate three separate code blocks:
                              1. HTML for the structure (inside <html_code> tags).
                              2. JavaScript for interactivity (inside <js_code> tags).
                              3. CSS for styling (inside <css_code> tags).
                    
                HTML file should follow JSON objects all fields and display on browser using js and css files that created as response
                when user run locally. Kindly note html file should have link and script tags to connect style.css and script.js files.
          
          User Prompt/Requirement: "${prompt}"

          Dynamic JSON Configuration:
          ---JSON START---
          ${jsonContent}
          ---JSON END---
        `;

                // Configure the API call
                const apiParams: GenerateContentParameters = {
                    model: this.model,
                    contents: fullPrompt,
                };

                // 3. Call the Gemini API
                const response = await this.ai.models.generateContent(apiParams);
                const textResponse = response.text ? response.text.trim() : '';

                // 4. Parse the response to extract the three code blocks
                return this.parseCodeBlocks(textResponse);
            })
        );
    }

    /**
     * Parses the text response to extract HTML, JS, and CSS based on custom delimiters.
     * @param text The full text response from the Gemini API.
     * @returns The structured GeneratedCode object.
     */
    private parseCodeBlocks(text: string): GeneratedCode {
        const htmlMatch = text.match(/<html_code>([\s\S]*?)<\/html_code>/i);
        const jsMatch = text.match(/<js_code>([\s\S]*?)<\/js_code>/i);
        const cssMatch = text.match(/<css_code>([\s\S]*?)<\/css_code>/i);

        // Clean up extracted code (remove newlines, trim, etc.)
        const cleanCode = (match: RegExpMatchArray | null): string =>
            match ? match[1].replace(/```(html|javascript|js|css)?\n/g, '').trim() : ``;

        if (!htmlMatch || !jsMatch || !cssMatch) {
            console.error("Gemini Response Parsing Error. Response:", text);
            throw new Error("Could not extract all HTML, JS, and CSS blocks. Check Gemini's output format.");
        }

        return {
            html: cleanCode(htmlMatch),
            javascript: cleanCode(jsMatch),
            css: cleanCode(cssMatch)
        };
    }
}