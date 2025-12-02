import { PrismaClient } from "@prisma/client";
import { Response, Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import { CredentialService } from "../services/CredentialService";
import { GoogleSheetsHelper } from "../services/GoogleSheetsHelper";

const router = Router();
const prisma = new PrismaClient();
const credentialService = new CredentialService();

/**
 * GET /api/google/spreadsheets
 * List all accessible spreadsheets
 */
router.get(
  "/spreadsheets",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const credentialId = req.query.credentialId as string;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential ID is required" },
      });
    }

    // Get credentials
    const credential = await credentialService.getCredential(
      credentialId,
      userId
    );
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: { message: "Credentials not found" },
      });
    }

    const spreadsheets = await GoogleSheetsHelper.listSpreadsheets(
      credential.data as any
    );

    res.json({
      success: true,
      data: { spreadsheets },
    });
  })
);

/**
 * GET /api/google/spreadsheets/:spreadsheetId
 * Get spreadsheet metadata
 */
router.get(
  "/spreadsheets/:spreadsheetId",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spreadsheetId } = req.params;
    const userId = req.user!.id;
    const credentialId = req.query.credentialId as string;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential ID is required" },
      });
    }

    const credential = await credentialService.getCredential(
      credentialId,
      userId
    );
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: { message: "Credentials not found" },
      });
    }

    const metadata = await GoogleSheetsHelper.getSpreadsheetMetadata(
      spreadsheetId,
      credential.data as any
    );

    res.json({
      success: true,
      data: metadata,
    });
  })
);

/**
 * GET /api/google/spreadsheets/:spreadsheetId/sheets
 * Get list of sheets in a spreadsheet
 */
router.get(
  "/spreadsheets/:spreadsheetId/sheets",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spreadsheetId } = req.params;
    const userId = req.user!.id;
    const credentialId = req.query.credentialId as string;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential ID is required" },
      });
    }

    const credential = await credentialService.getCredential(
      credentialId,
      userId
    );
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: { message: "Credentials not found" },
      });
    }

    const metadata = await GoogleSheetsHelper.getSpreadsheetMetadata(
      spreadsheetId,
      credential.data as any
    );

    res.json({
      success: true,
      data: { sheets: metadata.sheets || [] },
    });
  })
);

/**
 * GET /api/google/spreadsheets/:spreadsheetId/sheets/:sheetName/columns
 * Get columns from a sheet
 */
router.get(
  "/spreadsheets/:spreadsheetId/sheets/:sheetName/columns",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spreadsheetId, sheetName } = req.params;
    const userId = req.user!.id;
    const credentialId = req.query.credentialId as string;
    const hasHeader = req.query.hasHeader !== "false";

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential ID is required" },
      });
    }

    const credential = await credentialService.getCredential(
      credentialId,
      userId
    );
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: { message: "Credentials not found" },
      });
    }

    const columns = await GoogleSheetsHelper.getColumns(
      spreadsheetId,
      decodeURIComponent(sheetName),
      credential.data as any,
      hasHeader
    );

    res.json({
      success: true,
      data: { columns },
    });
  })
);

/**
 * GET /api/google/spreadsheets/:spreadsheetId/data
 * Get data from a range
 */
router.get(
  "/spreadsheets/:spreadsheetId/data",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spreadsheetId } = req.params;
    const userId = req.user!.id;
    const credentialId = req.query.credentialId as string;
    const range = req.query.range as string;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: { message: "Credential ID is required" },
      });
    }

    if (!range) {
      return res.status(400).json({
        success: false,
        error: { message: "Range is required" },
      });
    }

    const credential = await credentialService.getCredential(
      credentialId,
      userId
    );
    if (!credential) {
      return res.status(404).json({
        success: false,
        error: { message: "Credentials not found" },
      });
    }

    const data = await GoogleSheetsHelper.getSheetData(
      spreadsheetId,
      range,
      credential.data as any
    );

    res.json({
      success: true,
      data,
    });
  })
);

export default router;
