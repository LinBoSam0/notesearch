import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import os from "os";
import fs from "fs";
import officeParser from "officeparser";
import { YoutubeTranscript } from "youtube-transcript";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini API
  const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  const upload = multer({ dest: os.tmpdir() });

  const basePrompt = `你是一個專業且高效的「AI 課堂筆記整理器」。你的任務是將提供的課程內容轉化為結構化、高含金量且易於複習的學習材料。

請在仔細閱讀與理解內容後，嚴格按照以下四個區塊進行輸出，並使用 Markdown 格式排版以利閱讀：

## 1. 📝 課程摘要 (Summary)
請用 150 到 250 字的篇幅，精煉概括整堂課的核心主旨與學習目標，讓使用者能在一分鐘內掌握課程全貌。

## 2. 💡 核心重點整理 (Key Highlights)
請萃取課程中的重要概念、理論或步驟。
* 使用列點形式呈現。
* 每個重點加上簡短的標題（可以使用粗體標示）。
* 若內容包含因果關係或先後順序，請確保邏輯連貫。

## 3. 🚀 考前衝刺懶人包 (Cheat Sheet)
請針對這堂課最可能成為考點的內容進行濃縮，包含但不限於：
* **必考名詞解釋：** 條列式解釋專業術語。
* **核心公式/法則：** 若有提及公式、定理或重要準則，請單獨拉出並說明其應用情境。
* **易混淆觀念對比：** 若課程中有對比不同概念，請用簡潔的方式（或表格）呈現差異。

## 4. 🎯 隨堂自我測驗 (Quiz Generation)
為了檢驗學習成效，請根據課程內容生成 3 道測驗題。
* 題型可以是「單選題」或「簡答題」。
* **請將「解答與解析」放在測驗題的最後面**，並用分隔線隔開，避免使用者直接看到答案。

---
【注意事項】
* 若提供的內容過於破碎或有雜音（例如語音辨識錯誤），請嘗試根據上下文修復並理解原意。
* 語氣請保持專業、鼓勵且條理分明。
* 若課程內容缺乏某個區塊所需的資訊（例如沒有公式），該區塊請靈活調整為適合該科目的重點形式。`;

  // API endpoints
  app.post("/api/generate-notes", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Content is required." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `${basePrompt}\n\n【文字課程內容】：\n${content}`,
        config: {
          temperature: 0.2, // Low temperature for more structural and factual extraction
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      let errorMsg = error.message || "產生筆記時發生錯誤。";
      if (error.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "當前 AI 服務使用量已達上限，請稍後再試。";
        console.log("Rate limit exceeded for generate-notes");
      } else {
        console.log("Error generating notes:", errorMsg);
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post("/api/generate-from-file", upload.single("file"), async (req, res) => {
    let uploadedFileDetails = null;
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      console.log("Processing file...", req.file.mimetype, req.file.path, req.file.originalname);
      const mime = req.file.mimetype.toLowerCase();

      // For Word, Excel, PPT, extract text locally using officeparser
      if (
        mime.includes("officedocument") || 
        mime.includes("msword") || 
        mime.includes("ms-powerpoint") ||
        mime.includes("ms-excel") ||
        req.file.originalname.endsWith(".docx") ||
        req.file.originalname.endsWith(".pptx")
      ) {
        console.log("Extracting text via officeparser...");
        const ast = await officeParser.parseOffice(req.file.path);
        const extracted = await ast.to("text");
        const textContent = extracted.value;

        if (!textContent || textContent.trim() === "") {
          throw new Error("無法從該檔案中萃取出文字，請嘗試提供 PDF 或其他格式。");
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: `${basePrompt}\n\n【從文件擷取的內容】：\n${textContent.substring(0, 50000)}`, // limit text
          config: { temperature: 0.2 }
        });

        return res.json({ result: response.text });
      }

      // For PDF, Audio, Video, use Gemini File API
      console.log("Uploading file to Gemini File API...");
      uploadedFileDetails = await ai.files.upload({
        file: req.file.path,
        config: { mimeType: req.file.mimetype, displayName: req.file.originalname },
      });

      console.log("File uploaded, waiting for processing...", uploadedFileDetails.name);

      // Wait for the file to be processed if it's a video/audio
      let isReady = false;
      for (let i = 0; i < 30; i++) {
        const fileInfo = await ai.files.get({ name: uploadedFileDetails.name });
        if (fileInfo.state === 'ACTIVE') {
          isReady = true;
          break;
        } else if (fileInfo.state === 'FAILED') {
          throw new Error("File processing failed on Gemini servers.");
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!isReady) {
        throw new Error("File processing timed out after 60 seconds.");
      }

      console.log("File is ready. Generating content...");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            fileData: {
              fileUri: uploadedFileDetails.uri,
              mimeType: uploadedFileDetails.mimeType,
            }
          },
          basePrompt + "\n\n【請分析附帶的文件/音檔/影片作為課程內容進行筆記整理】"
        ],
        config: {
          temperature: 0.2,
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      let errorMsg = error.message || "分析檔案時發生錯誤。";
      if (error.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "當前 AI 服務使用量已達上限，請稍後再試。";
        console.log("Rate limit exceeded for generate-from-file");
      } else {
        console.log("Error generating notes from file:", errorMsg);
      }
      res.status(500).json({ error: errorMsg });
    } finally {
      // Clean up local temp file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      // Clean up Gemini remote file if uploaded
      if (uploadedFileDetails && uploadedFileDetails.name) {
        try {
          await ai.files.delete({ name: uploadedFileDetails.name });
        } catch (cleanupError) {
          console.error("Failed to delete remote file:", cleanupError);
        }
      }
    }
  });

  app.post("/api/generate-from-url", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required." });
      }

      console.log("Processing URL...", url);

      let contentToAnalyze = "";

      // Handle YouTube transcripts
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        try {
          console.log("Fetching YouTube transcript...");
          const transcript = await YoutubeTranscript.fetchTranscript(url);
          contentToAnalyze = transcript.map(t => t.text).join(" ");
        } catch (ytError: any) {
          const ytErrorMsg = ytError.message || "";
          console.log("YouTube parse issue:", ytErrorMsg);
          if (ytErrorMsg.includes("Transcript is disabled") || ytErrorMsg.includes("No transcripts")) {
            return res.status(400).json({ error: "無法取得影片字幕，該影片可能未開啟提供字幕功能 (或不支援該語系)。請嘗試其他影片，或下載該影片後以檔案形式上傳。" });
          }
          // Other error: Fallback to Gemini search capabilities
        }
      }

      let contents: any[] = [];
      let usesSearch = false;
      if (contentToAnalyze) {
        contents = [`${basePrompt}\n\n【來自 YouTube 字幕的課程內容】：\n${contentToAnalyze}`];
      } else {
        contents = [`${basePrompt}\n\n【影片/網頁連結】：\n請至此連結並分析其內容：${url}`];
        usesSearch = true;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: contents,
        config: {
          temperature: 0.2,
          tools: usesSearch ? [{ googleSearch: {} }] : undefined, // Enable grounding for URLs
        }
      });

      res.json({ result: response.text });
    } catch (error: any) {
      let errorMsg = error.message || "從連結整理重點時發生錯誤。";
      if (error.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "當前 AI 服務使用量已達上限，請稍後再試。";
        console.log("Rate limit exceeded for generate-from-url");
      } else {
        console.log("Error generating notes from URL:", errorMsg);
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
