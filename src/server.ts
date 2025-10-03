import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { environment } from './environment';
const fs = require("fs")
const multer = require("multer");
const { GoogleGenAI } = require('@google/genai');
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const model = 'gemini-2.5-flash';
const app = express();
const commonEngine = new CommonEngine();
const ai = new GoogleGenAI(environment.geminiApiKey);
const uploads = multer({ dest: "uploads/" });
/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});


// app.post("/api/gemini", async (req, res) => {
//   const response = await fetch(
//     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(req.body),
//     }
//   );
//   const data = await response.json();
//   res.json(data);
// });

app.post("/api/gemini", async (req, res) => {
  try {
    const { pdfText, question } = req.body;

    if (!pdfText || !question) {
      return res.status(400).send({ error: 'Missing PDF text or question.' });
    }

    // Construct a powerful system prompt (RAG approach)
    const systemInstruction = `You are an expert document analysis chatbot. Your task is to answer the user's question ONLY based on the CONTEXT provided below. 
    If the answer is not found in the context, clearly state, "I cannot find the answer in the provided document."

    --- CONTEXT ---
    ${pdfText}
    --- END CONTEXT ---`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      }
    });

    return res.json({ text: response.text });
  } catch (error) {
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.post("/get", uploads.single("file"), async (req, res) => {
  const userInput = req.body.msg;
  const file = req.body.file;

  try {
    const model = GoogleGenAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let prompt = [userInput];
    if (file) {

      const filedata = fs.readFileSync(file.path);
      const image = {
        inlineData: {
          data: filedata.toString("base64"),
          mimeType: file.mimetype,
        },
      };
      prompt.push(image)
    }

    const response = await model.generateContent(prompt);
    res.send(response.response.text());

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (file) {
      fs.unlinkSync(file.path);
    }
  }
});


/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}
