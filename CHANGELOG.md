# Changelog

## Unreleased

- Health tab: a daily calorie counter with a ring against your goal (2,000 kcal to start; tap Goal to change it), protein, carbs and fat for the day, and what you ate grouped as Breakfast, Lunch, Snacks and Dinner. The count starts again at midnight on the phone; earlier days stay in history (use the arrows to look back or add to a past day).
- Foods: about 20 starter foods (coffee, roti, rice, dal, rajma, chana, chicken tikka, paneer tikka, eggs, curd, ghee, nuts, fruit) from USDA FoodData Central, with home dishes worked out from those ingredients. Add your own with the brand, a photo of the pack, and the label's values for whatever amount it prints (per 100 g, per 30 g serving, per 200 ml cup...). Log the grams or ml you ate and the app scales it.
- One tap for repeats: foods you've eaten show as photo tiles under Recent, with last time's amount ready. Tap anything logged to change the amount or meal, or remove it.
- Today shows a Calories today card. Foods and food logs sync between devices like everything else (pack photos included), and are in backups.
- Bookmarks: bookmark any exercise from its page or during a session. Bookmarks are listed by section (Strength, Mobility, Stretches, ...) from Today, and the library has a Bookmarked filter.
- Named lists: save exercises into your own lists (for example "Morning mobility") from the bookmark button. You can rename and delete lists, they appear on the Bookmarks screen and as library filters, and they show as tags on the exercise page.
- Sync between devices (optional): sign in from Settings with your own free Supabase project, and exercises, form cards with photos, links, bookmarks, lists, history and settings stay the same on your phone and Mac. It still works offline and syncs when there's signal. Setup in docs/SYNC.md.
- Share a workout as an image: Share workout on any finished session makes a PNG with the date, totals, a front and back body figure with the muscles worked, and every exercise with its sets. Share it straight to WhatsApp or Messages from the share sheet, or download it.
- Inbox removed: Today no longer has an Inbox button, and Save a link always files the link under an exercise. Links already in the inbox stay listed as Unsorted links on Save a link until you sort or delete them.
- Fix: bottom sheets no longer open behind the tab bar.
- Fix: on iPhones with a Dynamic Island or notch, the Home Screen app no longer hides the top of each screen (the date, titles and the workout header) under the status bar.

## 0.1.0 (2026-10-18)

First version: SRS sections 2.1 to 2.5, workout library and session logging.

- Today is a blank start screen with Start workout, Home HIIT, Save a link, Inbox and recent sessions.
- Start workout: front and back body map with one tap target per muscle, body-part pages that show the right side (back for lats and hamstrings), and an exercise list per muscle with equipment filters.
- Library of exercises, mobility, stretches, warm-ups and HIIT moves. Starter entries can be edited, renamed or removed; create your own from any list.
- Form cards: cues, Setup/Start/Mid/End photos with headings and notes, drawing (pen, line, arrow, text), crop, paste from the clipboard, and a full-screen zoom view for the gym.
- Labeled links per exercise (Proper form, What to focus on, ...), YouTube thumbnails that work offline, and your own cover image for Instagram or TikTok links.
- Share-sheet capture through an Apple Shortcut, with an inbox to sort links later.
- Sessions: typed weight and reps, a Last time card with every previous set, rest timer, swap when equipment is busy, add exercises from the body map mid-session.
- Home HIIT timer with work, rest and rounds.
- History with previous sets and best set per exercise.
- Offline: one self-contained page plus a service worker; data in IndexedDB; backup and restore to a JSON file.
