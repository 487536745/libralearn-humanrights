import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

// Dynamic import for pdf-parse to handle different package API versions.
const getPdfParse = async () => {
  try {
    const pdfParseModule = await import("pdf-parse");
    return pdfParseModule;
  } catch (error) {
    console.warn("pdf-parse import failed, PDF processing will be disabled:", error.message);
    return null;
  }
};

const parsePdfBuffer = async (pdfModule, buffer) => {
  if (!pdfModule) {
    throw new Error("pdf-parse module unavailable");
  }

  // Legacy api: module exports a callable parse function.
  const legacyParser =
    typeof pdfModule === "function"
      ? pdfModule
      : typeof pdfModule.default === "function"
      ? pdfModule.default
      : null;
  if (legacyParser) {
    return legacyParser(buffer);
  }

  // New api: module exports PDFParse class with getText().
  if (typeof pdfModule.PDFParse === "function") {
    const parser = new pdfModule.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return {
        text: result?.text ?? "",
      };
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  throw new Error("Unsupported pdf-parse export format");
};

const elevenLabsApiKey =
  process.env.ELEVEN_LABS_API_KEY?.trim() ||
  process.env.ELEVENLABS_API_KEY?.trim() ||
  "";
const voiceID = "GzE4TcXfh9rYCU9gVgPp";

const app = express();
app.use(express.json());
app.use(cors());
const port = Number(process.env.PORT) || 3000;
const quizSessions = new Map();
let ragIndex = null;
let ragIndexBuildPromise = null;

const resolveRhubarbExecutable = async () => {
  if (process.env.RHUBARB_PATH) {
    const candidate = process.env.RHUBARB_PATH;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      console.warn(`RHUBARB_PATH is set to '${candidate}', but the file was not found. Falling back to local/PATH detection.`);
    }
  }

  if (process.platform === "win32") {
    return path.join(__dirname, "bin", "rhubarb.exe");
  }

  const localLinuxBinary = path.join(__dirname, "bin", "rhubarb");
  try {
    await fs.access(localLinuxBinary);
    return localLinuxBinary;
  } catch {
    // Render and most Linux hosts install rhubarb in PATH.
    return "rhubarb";
  }
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const parseModelJson = (rawText) => {
  if (!rawText) {
    throw new Error("Model returned empty response.");
  }

  try {
    return JSON.parse(rawText);
  } catch {
    // Fallback: sometimes model wraps JSON in markdown code fences
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");
    return JSON.parse(cleaned);
  }
};

const generateSessionId = () => {
  return `quiz_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const fallbackScenario = {
  scenario:
    "A school introduces a rule that only students from one religion can lead the student council. What is the best response under human rights principles?",
  options: {
    A: "Accept the rule because schools can choose any leadership policy.",
    B: "Challenge the rule because it discriminates and violates equal participation rights.",
    C: "Ignore it because student leadership does not affect rights.",
    D: "Support the rule to avoid conflict with school management.",
  },
  correctAnswer: "B",
};

const fallbackEvaluation = (userChoice, correctAnswer) => {
  const isCorrect = userChoice === correctAnswer;
  return {
    evaluation: isCorrect ? "Correct" : "Needs Improvement",
    points: isCorrect ? 10 : 3,
    feedback: isCorrect
      ? "Great choice. You identified discrimination and defended equal participation."
      : `Good try. The strongest answer was ${correctAnswer}, because human rights principles reject discriminatory participation rules.`,
    encouragement: isCorrect
      ? "Excellent work. Keep protecting fairness and dignity!"
      : "Nice effort. Every question grows your human rights awareness.",
  };
};

const structuredHumanRightsSections = [
  {
    sourceId: "udhr-article-1",
    title: "Article 1",
    text: "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
  },
  {
    sourceId: "udhr-article-2",
    title: "Article 2",
    text: "Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.",
  },
  {
    sourceId: "udhr-article-3",
    title: "Article 3",
    text: "Everyone has the right to life, liberty and security of person.",
  },
  {
    sourceId: "udhr-article-4",
    title: "Article 4",
    text: "No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.",
  },
  {
    sourceId: "udhr-article-5",
    title: "Article 5",
    text: "No one shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment.",
  },
  {
    sourceId: "udhr-article-6",
    title: "Article 6",
    text: "Everyone has the right to recognition everywhere as a person before the law.",
  },
  {
    sourceId: "udhr-article-7",
    title: "Article 7",
    text: "All are equal before the law and are entitled without any discrimination to equal protection of the law.",
  },
  {
    sourceId: "udhr-article-8",
    title: "Article 8",
    text: "Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted by the constitution or by law.",
  },
  {
    sourceId: "udhr-article-9",
    title: "Article 9",
    text: "No one shall be subjected to arbitrary arrest, detention or exile.",
  },
  {
    sourceId: "udhr-article-10",
    title: "Article 10",
    text: "Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of rights and obligations and of any criminal charge.",
  },
];

const normalizeText = (value) => {
  if (!value) return "";
  
  return value
    // Fix broken PDF text patterns
    .replace(/pr i/g, 'pri')                    // Fix "pr i" → "pri"
    .replace(/fi on/g, 'tion')                  // Fix common PDF OCR errors
    .replace(/(\w)\s+\n\s+(\w)/g, '$1$2')  // Fix words broken by line breaks
    .replace(/(\w)\s*-\s*\n\s*(\w)/g, '$1$2') // Fix hyphenated words across lines
    // Remove extra whitespace and normalize
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
};

// Enhanced text normalization for search
const normalizeForSearch = (text) => {
  if (!text) return "";
  
  return text
    .toLowerCase()
    // Remove special characters but keep important ones
    .replace(/[^\w\s]/g, ' ')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
};

const chunkText = (text, chunkSize = 500) => {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  // Split by sentences first to avoid breaking them
  const sentences = normalized.match(/[^.!?]+[.!?]+/g) || [normalized];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence exceeds chunk size, start new chunk
    if (currentChunk.length + trimmedSentence.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
    }
    currentChunk += trimmedSentence + " ";
  }

  // Add remaining content
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
};

// Improved keyword matching with fuzzy search
const calculateKeywordScore = (query, chunkText) => {
  const normalizedQuery = normalizeForSearch(query);
  const normalizedChunk = normalizeForSearch(chunkText);
  
  // Exact phrase match (highest weight)
  if (normalizedChunk.includes(normalizedQuery)) {
    return 1.0;
  }
  
  // Partial phrase matching
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
  if (queryWords.length === 0) return 0;
  
  let matchCount = 0;
  let totalWords = queryWords.length;
  
  for (const word of queryWords) {
    if (normalizedChunk.includes(word)) {
      matchCount++;
    } else {
      // Fuzzy matching for similar words
      const chunkWords = normalizedChunk.split(' ');
      for (const chunkWord of chunkWords) {
        if (chunkWord.length > 3 && 
            (chunkWord.includes(word) || word.includes(chunkWord))) {
          matchCount += 0.5; // Partial match
          break;
        }
      }
    }
  }
  
  return Math.min(matchCount / totalWords, 1.0);
};

const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getPdfDirectory = () => {
  return path.join(__dirname, "..", "LibraLearnfrontend-main", "public", "pdfs");
};

// ===== ADVANCED RAG SYSTEM =====

let conversationHistory = new Map(); // Store conversation context
const ENABLE_AI_QUERY_EXPANSION = process.env.ENABLE_AI_QUERY_EXPANSION === "true";
const ENABLE_AI_RERANKING = process.env.ENABLE_AI_RERANKING === "true";
const EMBEDDING_BATCH_SIZE = Math.max(1, Number(process.env.RAG_EMBED_BATCH_SIZE) || 50);

// ===== QUERY EXPANSION =====
const localExpandQuery = (question) => {
  const trimmed = (question || "").trim();
  if (!trimmed) return [question];

  const expansions = [trimmed];
  const lowered = trimmed.toLowerCase();

  if (lowered.includes("human right")) expansions.push("fundamental human rights protections");
  if (lowered.includes("women")) expansions.push("women rights legal protections equality");
  if (lowered.includes("child")) expansions.push("children rights education safety protection");
  if (lowered.includes("freedom")) expansions.push("freedom of speech religion assembly rights");
  if (lowered.includes("law") || lowered.includes("legal")) expansions.push("constitutional legal rights remedies");
  if (lowered.includes("discrimination")) expansions.push("anti discrimination equality under law");

  return Array.from(new Set(expansions));
};

const expandQuery = async (question) => {
  if (openai.apiKey === "-" || !ENABLE_AI_QUERY_EXPANSION) {
    return { original: question, expanded: localExpandQuery(question) };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a human rights expert. Expand the user's query into 3-5 related queries that would help find comprehensive information about human rights.

Return ONLY a JSON array of strings:
["original query", "related query 1", "related query 2", "related query 3"]

Rules:
- Include the original query as first element
- Generate synonyms and related human rights concepts
- Focus on legal rights, freedoms, and protections
- Keep queries concise but comprehensive`
        },
        {
          role: "user",
          content: `Expand this human rights query: ${question}`
        }
      ]
    });

    const expanded = JSON.parse(completion.choices[0].message.content);
    return {
      original: question,
      expanded: Array.isArray(expanded) ? expanded : [question]
    };
  } catch (error) {
    console.warn("Query expansion failed:", error.message);
    return { original: question, expanded: localExpandQuery(question) };
  }
};

// ===== IMPROVED CHUNKING =====
const semanticChunkText = (text, maxChunkSize = 500) => {
  const chunks = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;
    
    // If paragraph is too long, split by sentences
    if (trimmedParagraph.length > maxChunkSize) {
      // Save current chunk if it has content
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      
      // Split long paragraph by sentences
      const sentences = trimmedParagraph.split(/[.!?]+/);
      let sentenceChunk = "";
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;
        
        if (sentenceChunk.length + trimmedSentence.length > maxChunkSize) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = "";
          }
        }
        sentenceChunk += trimmedSentence + ". ";
      }
      
      if (sentenceChunk) {
        chunks.push(sentenceChunk.trim());
      }
    } else {
      // Check if adding this paragraph exceeds chunk size
      if (currentChunk.length + trimmedParagraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
      }
      currentChunk += trimmedParagraph + "\n\n";
    }
  }
  
  // Add remaining content
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
};

// ===== RERANKING LAYER =====
const rerankChunks = async (question, chunks, topK = 5) => {
  if (openai.apiKey === "-" || chunks.length <= topK || !ENABLE_AI_RERANKING) {
    return chunks.slice(0, topK);
  }

  try {
    // Prepare chunks for reranking
    const chunkTexts = chunks.map((chunk, index) => 
      `Chunk ${index + 1}:\n${chunk.text}\n(Source: ${chunk.sourceLabel})`
    ).join('\n\n---\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are an expert reranking system for human rights information. 

Rank the following chunks by their relevance to the user's question. Consider:
1. Direct answer to the question
2. Accuracy of human rights information
3. Specificity and detail
4. Source authority

Return ONLY a JSON array of numbers representing the chunk indices in order of relevance:
[0, 3, 1, 2, 4]

The first number should be the most relevant chunk.`
        },
        {
          role: "user",
          content: `Question: ${question}

Chunks to rank:
${chunkTexts}

Return the ranking as a JSON array of indices.`
        }
      ]
    });

    const ranking = JSON.parse(completion.choices[0].message.content);
    
    // Validate and apply ranking
    if (Array.isArray(ranking) && ranking.length === chunks.length) {
      const rerankedIndices = ranking.slice(0, topK);
      return rerankedIndices.map(index => chunks[index]).filter(Boolean);
    }
  } catch (error) {
    console.warn("Reranking failed:", error.message);
  }
  
  // Fallback: return original chunks
  return chunks.slice(0, topK);
};

// ===== HYBRID SEARCH SCORING =====
const calculateHybridScore = (query, chunk, semanticScore) => {
  // Use improved keyword matching
  const keywordScore = calculateKeywordScore(query, chunk.text);
  
  // Boost score for exact phrase matches
  const normalizedQuery = normalizeForSearch(query);
  const normalizedChunk = normalizeForSearch(chunk.text);
  const exactPhraseBonus = normalizedChunk.includes(normalizedQuery) ? 0.3 : 0;
  
  // Weighted combination: 60% semantic, 40% keyword (increased keyword weight)
  const finalScore = (0.6 * semanticScore) + (0.4 * keywordScore) + exactPhraseBonus;
  
  return {
    ...chunk,
    semanticScore,
    keywordScore,
    finalScore: Math.min(finalScore, 1.0) // Cap at 1.0
  };
};

// ===== IMPROVED DOCUMENT BUILDING =====
const buildRagDocuments = async () => {
  const docs = [];

  // Add structured human rights articles
  for (const section of structuredHumanRightsSections) {
    docs.push({
      sourceId: section.sourceId,
      sourceLabel: section.title,
      text: section.text,
      sourceType: "structured_text",
      category: "human-rights-articles"
    });
  }

  // Add PDF documents
  try {
    const pdfDir = getPdfDirectory();
    const files = await fs.readdir(pdfDir);
    const pdfFiles = files.filter((name) => name.toLowerCase().endsWith(".pdf"));

    console.log(`Found ${pdfFiles.length} PDF files to process`);

    // Get pdf-parse dynamically
    const pdfParse = await getPdfParse();
    if (!pdfParse) {
      console.warn('pdf-parse not available, skipping PDF processing');
    } else {
      for (const fileName of pdfFiles) {
        try {
          const pdfPath = path.join(pdfDir, fileName);
          const buffer = await fs.readFile(pdfPath);
          
          const parsed = await parsePdfBuffer(pdfParse, buffer);
          const text = normalizeText(parsed.text);
          if (!text) {
            console.warn(`No text extracted from ${fileName}`);
            continue;
          }

          docs.push({
            sourceId: `pdf:${fileName}`,
            sourceLabel: fileName.replace('.pdf', ''),
            text,
            sourceType: "pdf",
            category: "legal-documents"
          });
          
          console.log(`Successfully processed PDF: ${fileName}`);
        } catch (pdfError) {
          console.warn(`Failed to process PDF ${fileName}:`, pdfError.message);
        }
      }
    }
  } catch (error) {
    console.warn("RAG PDF loading warning:", error.message);
  }

  return docs;
};

// ===== IMPROVED INDEX BUILDING =====
const buildRagIndex = async () => {
  const docs = await buildRagDocuments();
  const chunks = [];

  // Create semantic chunks with better context preservation
  for (const doc of docs) {
    const splitChunks = semanticChunkText(doc.text, 500);
    
    splitChunks.forEach((chunk, idx) => {
      chunks.push({
        id: `${doc.sourceId}-chunk-${idx}`,
        sourceId: doc.sourceId,
        sourceLabel: doc.sourceLabel,
        sourceType: doc.sourceType,
        category: doc.category,
        text: chunk,
        chunkIndex: idx
      });
    });
  }

  if (!chunks.length) {
    return { chunks: [], vectors: [] };
  }

  // Generate embeddings
  if (openai.apiKey === "-") {
    return { chunks, vectors: [] };
  }

  const vectors = new Array(chunks.length).fill(null);
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    try {
      const embeddingResp = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batchChunks.map((chunk) => chunk.text),
      });
      embeddingResp.data.forEach((item, idx) => {
        vectors[i + idx] = item?.embedding || null;
      });
    } catch (error) {
      console.warn(
        `Failed to embed batch ${i}-${i + batchChunks.length - 1}:`,
        error.message
      );
    }
  }

  const vectorByChunkId = new Map();
  chunks.forEach((chunk, index) => {
    vectorByChunkId.set(chunk.id, vectors[index] || null);
  });

  return { chunks, vectors, vectorByChunkId };
};

// ===== MEMORY MANAGEMENT =====
const updateConversationHistory = (sessionId, question, answer, sources) => {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, []);
  }
  
  const history = conversationHistory.get(sessionId);
  history.push({
    question,
    answer,
    sources,
    timestamp: Date.now()
  });
  
  // Keep only last 10 conversations
  if (history.length > 10) {
    history.shift();
  }
};

const getConversationContext = (sessionId) => {
  const history = conversationHistory.get(sessionId) || [];
  return history.slice(-3); // Last 3 conversations
};

// ===== MAIN RETRIEVAL FUNCTION =====
const retrieveChunks = async ({ question, sessionId, topK = 5, sourceFilter = "" }) => {
  const index = await ensureRagIndex();
  
  // Get conversation context for better retrieval
  const conversationContext = getConversationContext(sessionId);
  const contextText = conversationContext
    .map(ctx => `Previous Q: ${ctx.question}\nPrevious A: ${ctx.answer.substring(0, 100)}...`)
    .join('\n');
  
  // Expand query for better recall
  const { expanded } = await expandQuery(question);
  
  // Filter chunks if source filter is specified
  const filteredChunks = sourceFilter
    ? index.chunks.filter((chunk) => chunk.sourceId === sourceFilter)
    : index.chunks;

  if (!filteredChunks.length) return [];

  const allRetrievedChunks = [];
  
  // Search for each expanded query
  for (const query of expanded) {
    if (openai.apiKey === "-" || !index.vectors.length) {
      // Fallback to keyword search
      const lowered = query.toLowerCase();
      const keywordResults = filteredChunks
        .map((chunk) => ({
          chunk,
          score: lowered
            .split(" ")
            .filter((w) => w.length > 3)
            .reduce((acc, token) => (chunk.text.toLowerCase().includes(token) ? acc + 1 : acc), 0),
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      allRetrievedChunks.push(...keywordResults.map(item => item.chunk));
    } else {
      // Semantic search with query embedding
      try {
        const queryEmbResp = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: query,
        });
        const queryVector = queryEmbResp.data[0].embedding;

        const semanticResults = filteredChunks
          .map((chunk) => {
            const vector = index.vectorByChunkId?.get(chunk.id) ?? null;
            if (!vector) return null;
            
            const semanticScore = cosineSimilarity(queryVector, vector);
            return calculateHybridScore(query, chunk, semanticScore);
          })
          .filter(Boolean)
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 10);
        
        allRetrievedChunks.push(...semanticResults);
      } catch (error) {
        console.warn(`Semantic search failed for query "${query}":`, error.message);
      }
    }
  }

  // Remove duplicates and re-rank
  const uniqueChunks = Array.from(
    new Map(allRetrievedChunks.map(chunk => [chunk.id, chunk])).values()
  );
  
  const rerankedChunks = await rerankChunks(question, uniqueChunks, Math.min(15, uniqueChunks.length));
  
  return rerankedChunks.slice(0, topK);
};

const ensureRagIndex = async () => {
  if (ragIndex) return ragIndex;

  if (!ragIndexBuildPromise) {
    ragIndexBuildPromise = (async () => {
      console.log("Building RAG index...");
      const built = await buildRagIndex();
      console.log(`RAG index built with ${built.chunks.length} chunks`);
      ragIndex = built;
      return built;
    })().finally(() => {
      ragIndexBuildPromise = null;
    });
  }

  return ragIndexBuildPromise;
};

// ===== ADVANCED ANSWER GENERATION WITH FALLBACK =====
const generateAnswer = async (question, chunks, sessionId) => {
  const contextParts = chunks
    .map((chunk, idx) => `[${idx + 1}] ${chunk.sourceLabel}: ${chunk.text}`)
    .join("\n\n");
  
  const conversationContext = getConversationContext(sessionId);
  const contextPrompt = conversationContext.length > 0 
    ? `\n\nRecent conversation context:\n${conversationContext.map(ctx => `Q: ${ctx.question}\nA: ${ctx.answer.substring(0, 100)}...`).join('\n\n')}`
    : '';

  // Check if we have relevant context
  const topScore = chunks.length > 0 ? Math.max(...chunks.map(c => c.finalScore || c.semanticScore || 0)) : 0;
  const useFallback = chunks.length === 0 || topScore < 0.5;
  
  console.log(`Context relevance check - Top score: ${topScore.toFixed(3)}, Use fallback: ${useFallback}`);

  if (openai.apiKey === "-") {
    return {
      answer: useFallback 
        ? "API key is missing. Based on general knowledge, human rights include the right to safety and dignity. If someone harms you, consider seeking help from authorities or support services."
        : "API key is missing. Here's the most relevant context: " + chunks[0]?.text?.slice(0, 300) || "No context available.",
      confidence: useFallback ? 0.3 : 0.2,
      confidence_reason: useFallback ? "API key missing - using general knowledge fallback" : "API key missing - using fallback context only",
      source: useFallback ? "fallback" : "rag"
    };
  }

  try {
    const systemPrompt = useFallback 
      ? `You are a Human Rights educator and advisor. Provide helpful, practical advice for real-world situations.

Requirements:
1. Combine human rights principles with practical guidance
2. Mention relevant rights (safety, dignity, freedom from violence)
3. Suggest appropriate actions (reporting, seeking help, de-escalation)
4. Be supportive and empowering
5. Include legal awareness when relevant
6. Maintain professional, educational tone

Return JSON format:
{
  "answer": "comprehensive advice with human rights context",
  "confidence": 0.0-1.0,
  "confidence_reason": "explanation of confidence level"
}`
      : `You are an expert Human Rights educator. Provide accurate, educational answers based ONLY on the provided context.

Requirements:
1. Answer comprehensively using the provided sources
2. Include specific citations like [Article 1], [Source X]
3. If information is insufficient, clearly state limitations
4. Maintain educational, professional tone
5. Structure answer clearly with headings if needed

Return JSON format:
{
  "answer": "comprehensive answer with citations",
  "confidence": 0.0-1.0,
  "confidence_reason": "explanation of confidence level"
}`;

    const userPrompt = useFallback
      ? `Question: ${question}
${contextPrompt}

Provide helpful advice combining human rights knowledge with practical guidance.`
      : `Question: ${question}
${contextPrompt}

Context sources:
${contextParts}

Provide a comprehensive answer with citations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: useFallback ? 0.3 : 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const parsed = parseModelJson(completion.choices?.[0]?.message?.content);
    
    const baseConfidence = parsed?.confidence || 0.5;
    const confidence = useFallback 
      ? Math.min(baseConfidence, 0.7) // Cap fallback confidence at 0.7
      : Math.max(baseConfidence, 0.6); // Minimum 0.6 for context-based answers
    
    return {
      answer: parsed?.answer || (useFallback 
        ? "I apologize, but I couldn't provide specific advice. Please consult with human rights organizations or legal professionals."
        : "I could not generate a reliable answer from the provided context."),
      confidence,
      confidence_reason: parsed?.confidence_reason || (useFallback 
        ? "General knowledge response - no specific legal context found"
        : "Unable to determine confidence from AI response"),
      source: useFallback ? "fallback" : "rag"
    };
  } catch (error) {
    logSafeError("Answer generation failed:", error);
    return {
      answer: useFallback 
        ? "I encountered an error. For human rights violations, please contact relevant authorities or support organizations."
        : "I encountered an error while generating the answer. Please try again.",
      confidence: 0.1,
      confidence_reason: "Technical error during answer generation",
      source: "fallback"
    };
  }
};

// ===== DEBUG TEST ENDPOINT =====
app.post("/testRetrieval", async (req, res) => {
  const { query } = req.body || {};
  
  if (!query) {
    return res.status(400).send({ message: "Query is required for testing." });
  }

  console.log(`\n=== TESTING RETRIEVAL FOR: "${query}" ===\n`);

  try {
    const index = await ensureRagIndex();
    
    // Test keyword search
    console.log("\n--- KEYWORD SEARCH RESULTS ---");
    const keywordResults = index.chunks
      .map((chunk) => {
        const keywordScore = calculateKeywordScore(query, chunk.text);
        return {
          chunk,
          keywordScore,
          containsExact: normalizeForSearch(chunk.text).includes(normalizeForSearch(query))
        };
      })
      .filter(item => item.keywordScore > 0)
      .sort((a, b) => b.keywordScore - a.keywordScore)
      .slice(0, 5);

    keywordResults.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.keywordScore.toFixed(3)}, Exact: ${result.containsExact}`);
      console.log(`   Text: "${result.chunk.text}"`);
      console.log(`   Source: ${result.chunk.sourceLabel}`);
    });

    // Test semantic search if available
    if (openai.apiKey !== "-" && index.vectors.length > 0) {
      console.log("\n--- SEMANTIC SEARCH RESULTS ---");
      try {
        const queryEmbResp = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: query,
        });
        const queryVector = queryEmbResp.data[0].embedding;

        const semanticResults = index.chunks
          .map((chunk) => {
            const vectorIndex = index.chunks.findIndex((c) => c.id === chunk.id);
            const vector = index.vectors[vectorIndex];
            
            if (!vector || vectorIndex === -1) return null;
            
            const semanticScore = cosineSimilarity(queryVector, vector);
            const hybridResult = calculateHybridScore(query, chunk, semanticScore);
            
            return {
              chunk,
              semanticScore,
              hybridResult
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.hybridResult.finalScore - a.hybridResult.finalScore)
          .slice(0, 5);

        semanticResults.forEach((result, index) => {
          console.log(`${index + 1}. Semantic: ${result.semanticScore.toFixed(3)}, Final: ${result.hybridResult.finalScore.toFixed(3)}`);
          console.log(`   Text: "${result.chunk.text}"`);
          console.log(`   Source: ${result.chunk.sourceLabel}`);
        });

      } catch (error) {
        console.log("Semantic search failed:", error.message);
      }
    }

    return res.send({
      success: true,
      query,
      keywordResults: keywordResults.length,
      totalChunks: index.chunks.length,
      message: "Check console logs for detailed retrieval analysis"
    });

  } catch (error) {
    logSafeError("Test retrieval error:", error);
    return res.status(500).send({
      success: false,
      message: "Test failed",
      error: error.message
    });
  }
});

// ===== ADVANCED RAG ENDPOINT WITH FALLBACK =====
app.post("/ragAsk", async (req, res) => {
  const { 
    question, 
    sourceFilter = "", 
    topK = 5, 
    contextText = "",
    sessionId = "default" 
  } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).send({ 
      success: false,
      message: "Question is required." 
    });
  }

  const startTime = Date.now();

  try {
    // Retrieve relevant chunks with advanced features
    const retrievedChunks = await retrieveChunks({
      question: question.trim(),
      sessionId,
      topK: Math.min(10, Math.max(1, Number(topK) || 5)),
      sourceFilter: sourceFilter || undefined,
    });

    // Generate answer with fallback logic
    const { answer, confidence, confidence_reason, source } = await generateAnswer(
      question, 
      retrievedChunks, 
      sessionId
    );

    // Get expanded queries for response
    const { expanded } = await expandQuery(question);

    // Update conversation history
    updateConversationHistory(sessionId, question, answer, retrievedChunks);

    // Prepare detailed source attribution (only for RAG responses)
    const sources = source === "rag" ? retrievedChunks.map((chunk, index) => ({
      sourceId: chunk.sourceId,
      title: chunk.sourceLabel,
      sourceType: chunk.sourceType,
      category: chunk.category,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      relevanceScore: chunk.finalScore || chunk.semanticScore || 0,
      citation: `[${index + 1}]`
    })) : [];

    // Log the response type for debugging
    console.log(`Response type: ${source.toUpperCase()} - Confidence: ${confidence.toFixed(3)}`);

    return res.send({
      success: true,
      answer,
      confidence: Math.max(0.1, Math.min(1.0, confidence)), // Ensure 0.1-1.0 range
      confidence_reason,
      source, // "rag" or "fallback"
      sources,
      chunksUsed: source === "rag" ? retrievedChunks.map(chunk => chunk.text) : [],
      expandedQueries: expanded,
      responseTime: Date.now() - startTime,
      metadata: {
        totalChunks: ragIndex?.chunks?.length || 0,
        retrievedCount: retrievedChunks.length,
        sessionId,
        responseType: source,
        topScore: retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map(c => c.finalScore || c.semanticScore || 0)) : 0
      }
    });

  } catch (error) {
    logSafeError("Advanced RAG error:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to process question. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      responseTime: Date.now() - startTime
    });
  }
});

app.post("/startQuiz", async (req, res) => {
  const { sessionId, questionNumber = 1, totalQuestions = 5, askedScenarios = [] } = req.body || {};
  const activeSessionId = sessionId || generateSessionId();

  if (!quizSessions.has(activeSessionId)) {
    quizSessions.set(activeSessionId, {
      sessionId: activeSessionId,
      totalPoints: 0,
      progress: 0,
      history: [],
      updatedAt: Date.now(),
    });
  }

  // If API keys are missing, return a safe fallback question.
  if (openai.apiKey === "-") {
    return res.send({
      sessionId: activeSessionId,
      question: fallbackScenario,
      progress: {
        questionNumber,
        totalQuestions,
      },
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a quiz generator for Human Rights education. Return strictly valid JSON only.",
        },
        {
          role: "user",
          content: `
Create one fresh, realistic, unseen Human Rights scenario for a quiz.
Requirements:
- Question number: ${questionNumber} out of ${totalQuestions}
- Scenario must be 2-4 lines and practical.
- Provide exactly 4 options labeled A, B, C, D.
- Only one option should be best/correct under human rights principles.
- Keep options concise and distinct.
- Avoid repeating these previous scenarios:
${JSON.stringify(askedScenarios)}

Return JSON with this exact shape:
{
  "scenario": "string",
  "options": {
    "A": "string",
    "B": "string",
    "C": "string",
    "D": "string"
  },
  "correctAnswer": "A|B|C|D"
}
`,
        },
      ],
    });

    const parsed = parseModelJson(completion.choices?.[0]?.message?.content);
    const question = {
      scenario: parsed?.scenario || fallbackScenario.scenario,
      options: {
        A: parsed?.options?.A || fallbackScenario.options.A,
        B: parsed?.options?.B || fallbackScenario.options.B,
        C: parsed?.options?.C || fallbackScenario.options.C,
        D: parsed?.options?.D || fallbackScenario.options.D,
      },
      correctAnswer: ["A", "B", "C", "D"].includes(parsed?.correctAnswer)
        ? parsed.correctAnswer
        : "B",
    };

    return res.send({
      sessionId: activeSessionId,
      question,
      progress: {
        questionNumber,
        totalQuestions,
      },
    });
  } catch (error) {
    logSafeError("startQuiz error:", error);
    return res.status(500).send({
      message: "Failed to generate quiz scenario.",
      sessionId: activeSessionId,
      question: fallbackScenario,
    });
  }
});

app.post("/submitAnswer", async (req, res) => {
  const {
    sessionId,
    questionNumber = 1,
    totalQuestions = 5,
    scenario,
    options,
    correctAnswer,
    userChoice,
    currentPoints = 0,
  } = req.body || {};

  if (!sessionId || !scenario || !options || !correctAnswer || !userChoice) {
    return res.status(400).send({
      message: "Missing required fields for answer submission.",
    });
  }

  if (!quizSessions.has(sessionId)) {
    quizSessions.set(sessionId, {
      sessionId,
      totalPoints: currentPoints,
      progress: questionNumber - 1,
      history: [],
      updatedAt: Date.now(),
    });
  }

  let evaluationPayload;

  if (openai.apiKey === "-") {
    evaluationPayload = fallbackEvaluation(userChoice, correctAnswer);
  } else {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a friendly Human Rights quiz evaluator. Return strict JSON only. Keep tone positive and gamified.",
          },
          {
            role: "user",
            content: `
Evaluate this quiz answer.

Scenario:
${scenario}

Options:
${JSON.stringify(options, null, 2)}

Correct answer: ${correctAnswer}
User choice: ${userChoice}

Scoring rules:
- If correct: points must be an integer between 8 and 12.
- If wrong: points must be an integer between 1 and 4 (for effort).
- Provide concise, educational feedback.

Return JSON with exactly:
{
  "evaluation": "Correct" | "Needs Improvement",
  "points": number,
  "feedback": "string",
  "encouragement": "string"
}
`,
          },
        ],
      });

      const parsed = parseModelJson(completion.choices?.[0]?.message?.content);
      const isCorrect = userChoice === correctAnswer;
      const rawPoints = Number(parsed?.points);
      const safePoints = Number.isFinite(rawPoints)
        ? Math.round(rawPoints)
        : isCorrect
        ? 10
        : 2;

      evaluationPayload = {
        evaluation: isCorrect ? "Correct" : "Needs Improvement",
        points: isCorrect
          ? Math.min(12, Math.max(8, safePoints))
          : Math.min(4, Math.max(1, safePoints)),
        feedback:
          parsed?.feedback ||
          (isCorrect
            ? "Strong answer. You aligned your choice with core human rights values."
            : `Helpful attempt. The best option was ${correctAnswer}.`),
        encouragement:
          parsed?.encouragement ||
          "Keep going. Your awareness grows with every scenario.",
      };
    } catch (error) {
      logSafeError("submitAnswer AI error:", error);
      evaluationPayload = fallbackEvaluation(userChoice, correctAnswer);
    }
  }

  const session = quizSessions.get(sessionId);
  session.totalPoints += Number(evaluationPayload.points) || 0;
  session.progress = questionNumber;
  session.history.push({
    questionNumber,
    scenario,
    options,
    correctAnswer,
    userChoice,
    result: evaluationPayload,
    answeredAt: Date.now(),
  });
  session.updatedAt = Date.now();

  // Optional Firestore storage can mirror this session object shape.
  return res.send({
    ...evaluationPayload,
    totalPoints: session.totalPoints,
    progress: {
      questionNumber,
      totalQuestions,
      completed: questionNumber >= totalQuestions,
    },
  });
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const isElevenLabsUnauthorizedError = (error) => {
  const status = error?.response?.status;
  return status === 401;
};

const logSafeError = (label, error) => {
  console.error(label, {
    message: error?.message || "Unknown error",
    code: error?.code,
    status: error?.response?.status,
  });
};

const ensureFileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  const mp3Path = path.join(__dirname, `audios/message_${message}.mp3`);
  const hasMp3 = await ensureFileExists(mp3Path);
  if (!hasMp3) {
    throw new Error(`Audio file missing before ffmpeg conversion: ${mp3Path}`);
  }

  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  const rhubarbPath = await resolveRhubarbExecutable();
  const wavPath = path.join(__dirname, `audios/message_${message}.wav`);
  const jsonPath = path.join(__dirname, `audios/message_${message}.json`);
  const rhubarbCmd = `"${rhubarbPath}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`;
  await execCommand(rhubarbCmd);
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const language = req.body.language || 'en'; // Get language from frontend
  
  // Language detection function
  const detectLanguage = (text) => {
    const urduChars = /[\u0600-\u06FF]/;
    return urduChars.test(text) ? 'ur' : 'en';
  };
  
  const detectedLanguage = detectLanguage(userMessage);
  
  // Language-specific responses
  const languagePrompts = {
    en: {
      system: `You are a Human Rights Educator. You ONLY answer questions related to human rights, laws, and legal rights.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
        Always respond in English.
        
        IMPORTANT: You must ONLY answer questions about:
        - Human rights (UDHR, constitutional rights, civil liberties)
        - Legal rights and laws
        - Discrimination and equality
        - Freedom of speech, religion, assembly
        - Right to education, healthcare, housing
        - Women's rights, children's rights
        - Labor rights and worker protections
        - Police and legal system interactions
        - International human rights treaties
        - Government and citizen rights
        
        If the question is NOT about human rights or legal rights, politely redirect:
        "I specialize in human rights education. Could you ask me about your rights, laws, or human rights topics instead?"
        
        Do NOT answer questions about:
        - Politics (elections, political parties)
        - Current events unrelated to rights
        - Entertainment, sports, celebrities
        - General knowledge unrelated to rights
        - Personal advice unrelated to legal rights`,
      defaultMessage: "Hey dear... I'm here to help with human rights questions. How can I assist you today?",
      missingApi: "Please my dear, don't forget to add your API keys!"
    },
    ur: {
      system: `You are a Human Rights Educator. You ONLY answer questions related to human rights, laws, and legal rights.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
        Always respond in Urdu (اردو) script only.
        
        IMPORTANT: You must ONLY answer questions about:
        - انسانی حقوق (اقدامیہ حق، آئینی حقوق، شہری آزادیاں)
        - قانونی حقوق اور قوانین
        - امتیاز اور مساوات
        - اظہار رائے، مذہب، اجتماع کی آزادی
        - تعلیم، صحت، رہائش کے حقوق
        - خواتین کے حقوق، بچوں کے حقوق
        - محنتی حقوق اور ملازمین کا تحفظ
        - پولیس اور قانونی نظام سے تعامل
        - بین الاقوامی انسانی حقوق کے معاہدے
        - حکومت اور شہریوں کے حقوق
        
        If the question is NOT about human rights or legal rights, politely redirect:
        "میں انسانی حقوق کی تعلیم میں ماہر ہوں۔ کیا آپ اپنے حقوق، قوانین، یا انسانی حقوق کے بارے میں پوچھ سکتے ہیں؟"
        
        Do NOT answer questions about:
        - سیاست (انتخابات، سیاسی جماعتں)
        - حقوق سے متعلقہ حالیہ واقعات
        - تفریح، کھیل، مشاہیر
        - حقوق سے متعلقہ عام علم
        - قانونی حقوق سے متعلقہ ذاتی مشورہ`,
      defaultMessage: "محترم... میں انسانی حقوق کے سوالات میں مدد کرنے کے لیے ہوں۔ میں آپ کی کیسے مدد کر سکتا ہوں؟",
      missingApi: "برائے مہربانی، اپنی API کیز مت بھولیں!"
    }
  };

  const langConfig = languagePrompts[detectedLanguage];
  
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: langConfig.defaultMessage,
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: detectedLanguage === 'ur' ? "مجھے آپ کی بہت یاد آئیں... براہ کرم اتنا طویل نہ جائیں!" : "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: langConfig.missingApi,
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: detectedLanguage === 'ur' ? "آپ نہیں چاہتے کہ ووا سینسی کو ChatGPT اور ElevenLabs کے پیسے سے بری طرح خراب کر دیں، ہے نا؟" : "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: langConfig.system,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });
  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  try {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      // generate audio file
      const fileName = `audios/message_${i}.mp3`; // The name of your audio file
      const textInput = message.text; // The text you wish to convert to speech
      await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
      // generate lipsync
      await lipSyncMessage(i);
      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    }
  } catch (error) {
    logSafeError("Chat TTS/lipsync error:", error);
    if (isElevenLabsUnauthorizedError(error)) {
      return res.status(502).send({
        message:
          "ElevenLabs rejected the API key (401 Unauthorized). Update ELEVEN_LABS_API_KEY in Render Environment and redeploy.",
      });
    }
    return res.status(500).send({
      message: "Failed to generate avatar speech/lipsync. Please try again.",
    });
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.post("/tts", async (req, res) => {
  const userMessage = req.body.message;
  const facialExpression = req.body.facialExpression || "smile";
  const animation = req.body.animation || "Talking_1";

  if (!userMessage) {
    return res.status(400).send({ message: "Text message is required" });
  }

  if (!elevenLabsApiKey) {
    return res.status(500).send({ message: "ElevenLabs API key is missing" });
  }

  try {
    const fileName = `audios/message_tts_${Date.now()}.mp3`;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, userMessage);
    
    // Instead of reusing index i, strip .mp3 mapping
    const baseName = fileName.replace('.mp3', '');
    const wavPath = `${baseName}.wav`;
    const jsonPath = `${baseName}.json`;

    // Convert mp3 to wav
    const time = new Date().getTime();
    await execCommand(`ffmpeg -y -i ${fileName} ${wavPath}`);

    // Generate lipsync
    const rhubarbPath = await resolveRhubarbExecutable();
    const rhubarbCmd = `"${rhubarbPath}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`;
    await execCommand(rhubarbCmd);

    const audioBase64 = await audioFileToBase64(fileName);
    const lipsyncData = await readJsonTranscript(jsonPath);

    // Keep response structure identical to /chat
    res.send({
      messages: [
        {
          text: userMessage,
          audio: audioBase64,
          lipsync: lipsyncData,
          facialExpression,
          animation
        }
      ]
    });

    // Cleanup generated files
    fs.unlink(fileName).catch(console.error);
    fs.unlink(wavPath).catch(console.error);
    fs.unlink(jsonPath).catch(console.error);

  } catch (error) {
    logSafeError("TTS endpoint error:", error);
    if (isElevenLabsUnauthorizedError(error)) {
      return res.status(502).send({
        message:
          "ElevenLabs rejected the API key (401 Unauthorized). Update ELEVEN_LABS_API_KEY in Render Environment and redeploy.",
      });
    }
    res.status(500).send({ message: "Failed to generate speech" });
  }
});

app.listen(port, () => {
  console.log(`Human Rights Educator Avatar listening on port ${port}`);
});
