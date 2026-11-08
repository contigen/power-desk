import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { getDb, receiptUploads } from "../server/db/index.js";
import { randomUUID } from "node:crypto";

export default defineAction({
  description:
    "Store uploaded fuel receipt or pump display image metadata. The agent reads the image context to call log-fuel with parsed litres, price, and supplier. Actions perform no direct AI calls.",
  schema: z.object({
    filename: z.string().describe("File name of uploaded receipt image"),
    fileUrl: z.string().describe("Data URL or hosted URL of the receipt image"),
    fileSize: z.number().default(0).describe("File size in bytes"),
    mimeType: z.string().default("image/jpeg").describe("MIME type (e.g. image/jpeg, image/png)"),
    extractedData: z.string().optional().describe("Optional raw extracted JSON/text metadata"),
  }),
  http: { method: "POST" },
  run: async (input) => {
    const db = getDb();
    const id = `rcpt-${randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    await db.insert(receiptUploads).values({
      id,
      filename: input.filename,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      extractedData: input.extractedData ?? null,
      createdAt: nowIso,
    });

    return {
      success: true,
      receiptUploadId: id,
      filename: input.filename,
      fileUrl: input.fileUrl,
      message: `Receipt uploaded successfully (ID: ${id}). You can now log fuel with this receipt attached.`,
    };
  },
});
