# Specification

## Summary
**Goal:** Add OCR-based image upload feature that automatically extracts scout report data from screenshots.

**Planned changes:**
- Add tesseract.js dependency to frontend for OCR processing
- Create extractScoutFromImage utility that performs full-image OCR, extracts march size and troop counts, crops icon regions to detect tier (Roman numerals) and TG level (1-5 digit)
- Create canvas preprocessing utilities (imageFileToCanvas, cropCanvas, preprocessForOcr with grayscale and binary threshold)
- Create text parsing utilities (normalizeOcrText, parseNumberLoose, romanToTier, extractMarchSizeFromText, extractTroopCountsFromText)
- Update BattleCalculatorForm to trigger OCR on image upload and auto-populate scout textarea, march size, tier, TG level, and troop counts
- Handle separate image uploads for My Troops and Enemy Troops independently
- Add optional collapsible debug section showing OCR extraction details (romanText, tgText, iconBox coordinates)
- Add error handling with user-friendly messages for OCR failures
- Keep all auto-filled fields editable and optional for manual override

**User-visible outcome:** Users can upload scout report screenshots and have all battle data automatically extracted and populated, eliminating manual data entry while retaining the ability to review and edit extracted values.
