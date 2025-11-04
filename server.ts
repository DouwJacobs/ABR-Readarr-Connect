// server.ts
import express, { Request, Response } from "express";
import ReadarrAPI, { ReadarrBookOptions } from "./api/readarr-api"; // your API class
import logger from "./logger";

const app = express();
app.use(express.json());

interface WebhookBody {
  bookTitle: string;
  bookAuthors: string;
  eventUser?: string;
}

// ====== CONFIGURATION ======
const READARR_URL = process.env.READARR_URL!;
const READARR_API_KEY = process.env.READARR_API_KEY!;
const ROOT_FOLDER_PATH = process.env.ROOT_FOLDER_PATH!;
const QUALITY_PROFILE_ID = parseInt(process.env.QUALITY_PROFILE_ID || "2", 10);
const METADATA_PROFILE_ID = parseInt(process.env.METADATA_PROFILE_ID || "1", 10);
const READARR_SEARCH_ON_ADD = (process.env.READARR_SEARCH_ON_ADD || "false").toLowerCase() === "true";

if (!READARR_API_KEY) {
  logger.error("❌ READARR_API_KEY is not set. Exiting.");
  process.exit(1);
}

const READARR_API_BASE = `${READARR_URL.replace(/\/$/, '')}/api/v1`;
const readarr = new ReadarrAPI({ url: READARR_API_BASE, apiKey: READARR_API_KEY });

// ====== WEBHOOK ENDPOINT ======
app.post("/webhook/readarr", async (req: Request, res: Response) => {
  try {
    const { bookTitle, bookAuthors } = req.body as Partial<WebhookBody>;

    const authors = await readarr.getMetadataProfiles();

    if (typeof bookTitle !== "string" || bookTitle.trim().length === 0) {
      return res.status(400).json({ error: "Invalid or missing 'bookTitle'" });
    }
    if (typeof bookAuthors !== "string" || bookAuthors.trim().length === 0) {
      return res.status(400).json({ error: "Invalid or missing 'bookAuthors'" });
    }

    // Search by free-text query combining title and authors
    const term = `${bookTitle} ${bookAuthors}`.trim();
    const candidates = await readarr.searchBooks(term);
    const candidate = candidates[0];

    if (!candidate) {
      return res.status(404).json({ success: false, error: "Book not found from title/author search" });
    }

    // Derive Hardcover IDs from lookup result
    const hcId = Number((candidate as any)?.book.foreignBookId);
    const authorHcId = Number((candidate as any)?.book.author?.foreignAuthorId);

    if (!Number.isFinite(hcId) || !Number.isFinite(authorHcId)) {
      return res.status(422).json({ success: false, error: "Unable to derive identifiers required to add the book" });
    }

    const options: ReadarrBookOptions = {
      title: bookTitle,
      hcId,
      authorHcId,
      rootFolderPath: ROOT_FOLDER_PATH,
      qualityProfileId: QUALITY_PROFILE_ID,
      metadataProfileId: METADATA_PROFILE_ID,
      tags: [],
      profileId: 0,
      searchNow: READARR_SEARCH_ON_ADD,
    };

    const addedBook = await readarr.addBook(options);

    res.json({
      success: true,
      message: `Book "${addedBook.title}" added/monitored successfully`,
      book: {
        id: addedBook.id,
        title: addedBook.title,
        monitored: addedBook.monitored,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error("Webhook processing failed", { errorMessage: message, stack });
    res.status(500).json({ success: false, error: message });
  }
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    readarrUrl: READARR_URL,
    hasApiKey: !!READARR_API_KEY,
    qualityProfileId: QUALITY_PROFILE_ID,
    metadataProfileId: METADATA_PROFILE_ID,
    rootFolderPath: ROOT_FOLDER_PATH,
  });
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server started at http://localhost:${PORT}`);
  logger.info(`💚 Webhook endpoint: http://localhost:${PORT}/webhook/readarr`);
  logger.info(`💚 Health: http://localhost:${PORT}/health`);
});
