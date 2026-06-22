# 💍 Online Wedding Invitation

A single-page, fully static wedding invitation website — built with plain
HTML, CSS, and vanilla JavaScript. No build step, no backend. Drop it in an
**Amazon S3 bucket** and it just works.

## ✨ Features
- Hero with the couple's names, date, and a full-screen photo
- Live **countdown** to the wedding
- **Our Story**, **Event Details**, and a photo **Gallery**
- **Open in Google Maps** button (venue location)
- **Add to Google Calendar** button (save the date)
- Smooth scroll-reveal animations and transitions
- **Mobile-first**, responsive design (hamburger nav on phones)
- Graceful image placeholders until you add real photos

## 📁 Structure
```
.
├── index.html        # the page
├── css/styles.css    # styling, responsiveness, animations
├── js/
│   ├── config.js     # ⭐ EDIT THIS — all your content lives here
│   └── main.js       # logic (no edits needed)
└── assets/           # your images go here (see assets/README.txt)
```

## ✏️ How to customise
Open **`js/config.js`** and edit the values: names, date/time, venue,
Google Maps link, story text, gallery list, hashtag. That's it — the whole
page updates from this one file.

For the **Google Maps link**: open Google Maps, find your venue, click
*Share → Copy link*, and paste it into `mapsLink`.

For the **date**: set `dateISO` in `YYYY-MM-DDTHH:MM:SS` format — it powers
both the countdown and the calendar button.

## 🌐 Local preview
Just open `index.html` in a browser. (Images and config load fine over
`file://`.)

## ☁️ Deploy to Amazon S3 (static website hosting)
1. Create an S3 bucket (e.g. `our-wedding-site`).
2. **Upload** all files/folders, keeping the structure
   (`index.html`, `css/`, `js/`, `assets/`).
3. Bucket → **Properties → Static website hosting → Enable**.
   - Index document: `index.html`
4. Bucket → **Permissions**: turn off "Block all public access" and add a
   public-read bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicRead",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
     }]
   }
   ```
5. Open the **bucket website endpoint** URL — your invitation is live.

> Optional: put **CloudFront** in front for HTTPS + a custom domain.
