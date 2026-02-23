# Specification

## Summary
**Goal:** Activate the OCR image upload functionality by removing placeholder text and connecting upload buttons to the existing extraction system.

**Planned changes:**
- Remove "coming soon" placeholder text from My Troops and Enemy Troops upload buttons
- Remove error alert that appears when users click upload buttons stating the OCR feature is unavailable
- Connect both upload buttons to the existing extractScoutFromImage function to process uploaded images immediately
- Verify OCR correctly extracts tier (Roman numerals I-XI from bottom of troop icons) and TG level (digits 1-5 from top-right corner of troop icons)
- Auto-populate all form fields after successful extraction: scout paste textarea, march size, tier/TG dropdowns, and troop counts (infantry/cavalry/archer)
- Display clear error messages when OCR extraction fails, guiding users on image quality requirements
- Keep all auto-filled fields editable for manual corrections

**User-visible outcome:** Users can click the upload buttons on both My Troops and Enemy Troops sections to upload Kingshot scout report screenshots, which are automatically processed via OCR to extract and populate troop composition data including tier levels, TG levels, troop counts, and stat bonuses into the form fields.
