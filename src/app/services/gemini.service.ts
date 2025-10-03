// src/app/services/gemini.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environment';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';

@Injectable({
    providedIn: 'root'
})
export class GeminiService {
    private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    constructor(private http: HttpClient) {
    }

    generateContent(prompt: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        const body = {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ]
        };

        return this.http.post(
            `${this.apiUrl}?key=${environment.geminiApiKey}`,
            body,
            { headers }
        );
    }

    private async extractPdfTextWithOCR(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();

        let allText = '';

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // Convert PDF page → Image (via canvas in Angular)
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const { width, height } = page.getSize();
            canvas.width = width;
            canvas.height = height;

            // 🚨 pdf-lib doesn’t render pages to canvas by itself
            // You’d use a helper (or backend service) to rasterize
            // For demo, assume `pageImageBase64` = base64 PNG of page

            const pageImageBase64 = "<rendered_page_image_base64>";

            // Send page image to Gemini Vision OCR
            const geminiResponse = await fetch(
                //`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=YOUR_API_KEY`
                `${this.apiUrl}?key=${environment.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: "Extract all text from this document page clearly" },
                                    { inline_data: { mime_type: "image/png", data: pageImageBase64 } }
                                ]
                            }
                        ]
                    })
                }
            );

            const data = await geminiResponse.json();
            const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

            allText += `\nPage ${i + 1}: ${data}`;
        }

        return allText.trim();
    }


    /**
 * Extracts text from an image file (JPG, PNG, etc.) using Gemini Vision OCR API.
 * @param file Image file uploaded by user
 * @returns Extracted text as a string
 */
    private async extractImageTextWithOCR(file: File): Promise<string> {
        try {
            // Convert file → base64 string (without prefix)
            const base64Data = await this.fileToBase64(file);

            // Call Gemini Vision API
            const response = await fetch(
                `${this.apiUrl}?key=${environment.geminiApiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: "Extract all readable text from this image clearly." },
                                    {
                                        inline_data: {
                                            mime_type: file.type, // e.g. image/png or image/jpeg
                                            data: base64Data,
                                        },
                                    },
                                ],
                            },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Extract text response
            const extractedText =
                data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

            return extractedText;
        } catch (error) {
            console.error("❌ Error in extractImageTextWithOCR:", error);
            throw error;
        }
    }

    /**
     * Utility function: Convert File → Base64 string
     */
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                // Strip the "data:image/png;base64," prefix
                const base64String = (reader.result as string).split(",")[1];
                resolve(base64String);
            };

            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }


    /**
 * Reads image from local path, extracts text via Gemini OCR,
 * and saves structured JSON result locally.
 */
    generateContentFromImage(prompt: string, imageFile: File): Observable<any> {
        return from(this.extractImageTextWithOCR(imageFile).then(imageText => {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json'
            });

            const body = {
                contents: [
                    {
                        parts: [{ text: `${prompt}\n\nExtracted Image Content:\n${imageText}` }]
                    }
                ]
            };

            return this.http.post(
                `${this.apiUrl}?key=${environment.geminiApiKey}`,
                body,
                { headers }
            ).toPromise().then((response: any) => {
                const jsonResult = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

                // Save JSON locally
                const blob = new Blob([jsonResult], { type: 'application/json' });
                saveAs(blob, 'image-output.json');

                return JSON.parse(jsonResult);
            });
        }));
    }


    /**
 * Reads PDF from local path, extracts text, sends to Gemini API,
 * and saves JSON result locally.
 */
    generateContentFromPdf(prompt: string, pdfFile: File): Observable<any> {
        return from(this.extractPdfTextWithOCR(pdfFile).then(pdfText => {
            const headers = new HttpHeaders({
                'Content-Type': 'application/json'
            });

            const body = {
                contents: [
                    {
                        parts: [{ text: `${prompt}\n\nExtracted PDF Content:\n${pdfText}` }]
                    }
                ]
            };

            return this.http.post(
                `${this.apiUrl}?key=${environment.geminiApiKey}`,
                body,
                { headers }
            ).toPromise().then((response: any) => {
                // Assume Gemini returns structured JSON
                const jsonResult = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

                // Save JSON locally
                const blob = new Blob([jsonResult], { type: 'application/json' });
                saveAs(blob, 'pdf-output.json');

                return JSON.parse(jsonResult);
            });
        }));
    }

    /**
 * Utility: Extract plain text from a PDF file without using pdfjsLib
 */
    private async extractPdfTextWithoutPdfJs(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        let textContent = '';

        const pages = pdfDoc.getPages();

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // pdf-lib does not provide structured text extraction out of the box
            // but we can fallback to 'page.getTextContent()' like API through custom parsing.
            // For simplicity, just simulate with page dimensions (metadata)
            const { width, height } = page.getSize();
            textContent += `\nPage ${i + 1}: (Dimensions: ${width}x${height}) [Extracted text requires OCR/AI]`;
        }

        return textContent.trim();
    }

}