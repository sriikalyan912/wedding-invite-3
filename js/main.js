/* =============================================================
   main.js — wires config.js into the page + interactions
   No edits needed here for normal content changes.
   ============================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const setAll = (selector, value) =>
    $$(selector).forEach((el) => (el.textContent = value));

  const events = Array.isArray(WEDDING.events) ? WEDDING.events : [];
  // The countdown targets the first event (keep the main/soonest one first).
  const countdownDate = new Date(events.length ? events[0].dateISO : 0);

  // Elegant inline SVG used when a real photo isn't present yet.
  function placeholder(label) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
      '<rect width="600" height="600" fill="#eaf2fa"/>' +
      '<rect x="20" y="20" width="560" height="560" fill="none" stroke="#4a90d9" stroke-width="2"/>' +
      '<text x="300" y="290" font-family="Georgia, serif" font-size="46" fill="#4a90d9" text-anchor="middle">&#10086;</text>' +
      '<text x="300" y="340" font-family="Georgia, serif" font-size="22" fill="#2f6cb0" text-anchor="middle">' +
      (label || "Add your photo") +
      "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- 1. Inject content from config ---------- */
  function populate() {
    setAll("[data-groom]", WEDDING.groomName);
    setAll("[data-bride]", WEDDING.brideName);
    setAll("[data-intro]", WEDDING.intro);
    // Hero shows the first (main) event's date
    if (events.length) setAll("[data-display-date]", events[0].displayDate);
    setAll("[data-story-heading]", WEDDING.storyHeading);
    setAll("[data-story]", WEDDING.story);
    setAll("[data-hashtag]", WEDDING.hashtag);
    setAll("[data-footer-note]", WEDDING.footerNote);

    // Brand initials, e.g. "A & P"
    const initials =
      WEDDING.groomName.charAt(0) + " & " + WEDDING.brideName.charAt(0);
    setAll("[data-initials]", initials);

    // Page title
    document.title = WEDDING.groomName + " & " + WEDDING.brideName + " — Wedding";

    // Hero background image (separate layer so it can Ken-Burns zoom)
    const heroBg = $("#heroBg");
    if (heroBg && WEDDING.heroImage) {
      heroBg.style.backgroundImage = "url('" + WEDDING.heroImage + "')";
    }
  }

  /* ---------- 2. Build a Google Calendar URL for one event ---------- */
  function gcalUrl(ev) {
    const pad = (n) => String(n).padStart(2, "0");
    const toGCal = (d) =>
      d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";

    const start = new Date(ev.dateISO);
    const end = new Date(start.getTime() + (ev.durationHours || 4) * 3600 * 1000);
    const couple = WEDDING.groomName + " & " + WEDDING.brideName;
    const title = encodeURIComponent((ev.label || "Wedding") + " — " + couple);
    const location = encodeURIComponent(ev.venueName + ", " + ev.venueAddress);
    const detailsTxt = encodeURIComponent("Join us to celebrate! " + (WEDDING.hashtag || ""));

    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + title +
      "&dates=" + toGCal(start) + "/" + toGCal(end) +
      "&details=" + detailsTxt +
      "&location=" + location;
  }

  // Small inline SVG icons used in the event cards
  const ICON = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><circle cx="12" cy="14.5" r="2.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  };

  // True when there are 2+ events and they all share the exact same venue.
  function eventsShareVenue(list) {
    if (list.length < 2) return false;
    const first = list[0];
    return list.every(
      (ev) =>
        ev.venueName === first.venueName &&
        ev.venueAddress === first.venueAddress &&
        ev.mapsLink === first.mapsLink
    );
  }

  /* ---------- 2b. Build one card per event + the RSVP calendar buttons ---------- */
  function buildEvents() {
    const container = $("#eventsContainer");
    const rsvp = $("#rsvpActions");
    // When every event is at the same place, show the venue once as a shared
    // banner instead of repeating "Where" + a Maps button on every card.
    const sharedVenue = eventsShareVenue(events);

    events.forEach((ev) => {
      // ----- Event card -----
      if (container) {
        const card = document.createElement("article");
        card.className = "event-card reveal";
        const whereRow = sharedVenue
          ? ""
          : '<div class="event-card__row">' +
              '<span class="event-card__icon">' + ICON.pin + "</span>" +
              "<div><h3>Where</h3>" +
                '<p class="event-card__lead">' + ev.venueName + "</p>" +
                '<p class="event-card__addr">' + ev.venueAddress + "</p></div>" +
            "</div>";
        const mapsBtn = sharedVenue
          ? ""
          : '<a class="btn btn--ghost" target="_blank" rel="noopener" href="' + ev.mapsLink + '">View on Maps</a>';
        card.innerHTML =
          '<p class="event-card__label">' + ev.label + "</p>" +
          '<div class="event-card__row">' +
            '<span class="event-card__icon">' + ICON.cal + "</span>" +
            "<div><h3>When</h3>" +
              '<p class="event-card__lead">' + ev.displayDate + "</p>" +
              "<p>" + ev.displayTime + "</p></div>" +
          "</div>" +
          whereRow +
          '<div class="event-card__actions">' +
            '<a class="btn btn--primary" target="_blank" rel="noopener" href="' + gcalUrl(ev) + '">Add to Calendar</a>' +
            mapsBtn +
          "</div>";
        container.appendChild(card);
      }

      // ----- RSVP section: one calendar button per event -----
      if (rsvp) {
        const a = document.createElement("a");
        a.className = "btn btn--light";
        a.target = "_blank";
        a.rel = "noopener";
        a.href = gcalUrl(ev);
        a.textContent = "Add " + (ev.label || "").replace(/^The\s+/i, "");
        rsvp.appendChild(a);
      }
    });

    // ----- Shared venue banner (one common venue for all celebrations) -----
    if (container && sharedVenue) {
      const ev = events[0];
      const lead = events.length === 2 ? "Both celebrations" : "All celebrations";
      const banner = document.createElement("div");
      banner.className = "venue-banner reveal";
      banner.innerHTML =
        '<span class="venue-banner__icon">' + ICON.pin + "</span>" +
        '<p class="venue-banner__eyebrow">' + lead + " at one venue</p>" +
        '<h3 class="venue-banner__name">' + ev.venueName + "</h3>" +
        '<p class="venue-banner__addr">' + ev.venueAddress + "</p>" +
        '<a class="btn btn--primary" target="_blank" rel="noopener" href="' + ev.mapsLink + '">View on Maps</a>';
      container.insertAdjacentElement("afterend", banner);
    }
  }

  /* ---------- 3. Gallery + Lightbox ---------- */
  function buildGallery() {
    const grid = $("#galleryGrid");
    if (!grid || !Array.isArray(WEDDING.gallery)) return;
    WEDDING.gallery.forEach((src, i) => {
      const fig = document.createElement("figure");
      fig.className = "gallery__item reveal";
      const img = document.createElement("img");
      img.src = src;
      img.loading = "lazy";
      img.alt = WEDDING.groomName + " & " + WEDDING.brideName + " photo " + (i + 1);
      img.dataset.retries = "0";
      img.addEventListener("error", function () {
        const tries = parseInt(img.dataset.retries, 10);
        if (tries < 1) {
          // transient blip — retry once with a cache-buster before giving up
          img.dataset.retries = String(tries + 1);
          setTimeout(function () {
            img.src = src + (src.indexOf("?") === -1 ? "?" : "&") + "r=" + Date.now();
          }, 600);
        } else {
          img.src = placeholder("Photo " + (i + 1));
        }
      });
      fig.appendChild(img);
      fig.addEventListener("click", () => openLightbox(i));
      grid.appendChild(fig);
    });
  }

  let lbIndex = 0;
  function openLightbox(i) {
    const lb = $("#lightbox");
    if (!lb) return;
    lbIndex = i;
    $("#lbImg").src = WEDDING.gallery[i];
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    const lb = $("#lightbox");
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function stepLightbox(dir) {
    const n = WEDDING.gallery.length;
    lbIndex = (lbIndex + dir + n) % n;
    $("#lbImg").src = WEDDING.gallery[lbIndex];
  }
  function initLightbox() {
    if (!$("#lightbox")) return;
    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbNext").addEventListener("click", () => stepLightbox(1));
    $("#lbPrev").addEventListener("click", () => stepLightbox(-1));
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!$("#lightbox").classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") stepLightbox(1);
      if (e.key === "ArrowLeft") stepLightbox(-1);
    });
  }

  /* ---------- Falling petals (subtle ambience) ---------- */
  function initPetals() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#a9cdee", "#4a90d9", "#7fb0e0", "#dbe8f4"];
    const count = window.innerWidth < 600 ? 9 : 16;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      const size = 7 + Math.random() * 8;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      const dur = 9 + Math.random() * 9;
      const delay = -Math.random() * dur;
      p.style.animation = "petalFall " + dur + "s linear " + delay + "s infinite";
      document.body.appendChild(p);
    }
    // Inject keyframes once (kept in JS so CSS stays declarative)
    const style = document.createElement("style");
    style.textContent =
      "@keyframes petalFall{0%{transform:translateY(-10vh) translateX(0) rotate(0);opacity:0}" +
      "10%{opacity:.6}90%{opacity:.6}" +
      "100%{transform:translateY(110vh) translateX(40px) rotate(360deg);opacity:0}}";
    document.head.appendChild(style);
  }

  /* ---------- 4. Countdown ---------- */
  function startCountdown() {
    const dEl = $("#cd-days"),
      hEl = $("#cd-hours"),
      mEl = $("#cd-mins"),
      sEl = $("#cd-secs");
    if (!dEl) return;

    function tick() {
      const diff = countdownDate.getTime() - Date.now();
      if (diff <= 0) {
        [dEl, hEl, mEl, sEl].forEach((e) => (e.textContent = "0"));
        const grid = $(".countdown__grid");
        const title = $("#countdown .sec-head__title");
        if (title) title.textContent = "The Day Is Here";
        if (grid) grid.style.display = "none";
        clearInterval(timer);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      dEl.textContent = days;
      hEl.textContent = hours;
      mEl.textContent = mins;
      sEl.textContent = secs;
    }
    tick();
    const timer = setInterval(tick, 1000);
  }

  /* ---------- 5. Scroll reveal (IntersectionObserver) ---------- */
  function initReveal() {
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------- 6. Nav (scroll state + mobile toggle) ---------- */
  function initNav() {
    const nav = $("#nav");
    const toggle = $("#navToggle");
    const menu = $("#navMenu");

    const onScroll = () => {
      if (window.scrollY > 60) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function closeMenu() {
      nav.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$(".nav__link", menu).forEach((link) =>
      link.addEventListener("click", closeMenu)
    );
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    populate();
    buildEvents();
    buildGallery();
    initLightbox();
    startCountdown();
    initNav();
    initReveal();
    initPetals();
  });
})();
