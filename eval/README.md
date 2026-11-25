# Accuracy test

1. Put 20 or more test photos in `images/`. Mix easy ones (clear album covers) with hard ones (unreadable black metal logos). Include a few photos that are not metal at all, to check that the app says "Unknown" instead of guessing.
2. In `labels.csv`, list each file and the correct band (album is optional). Replace the two example rows. For non-metal photos, write `NONE` as the band.
3. Run `npm run eval` to measure the current version, then change one setting at a time:
   - `npm run eval -- --max-size 1600`
   - `npm run eval -- --model gemini-3.7-flash`

How to read the summary:
- **Precision:** when it gives an answer, how often is it right? Low precision = confident wrong answers.
- **Coverage:** how often does it give an answer at all? Low coverage = too many "Unknown".
