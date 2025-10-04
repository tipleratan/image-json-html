// src/app/services/gemini.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environment';
import { saveAs } from 'file-saver';


@Injectable({
    providedIn: 'root'
})
export class DynamicFormService {
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

}