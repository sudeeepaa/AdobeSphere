"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var byId = Utils.byId;

function ensureHeroVideoPlayback() {
  var video = document.querySelector("#about-hero .hero__video");
  if (!video) return;

  video.loop = true;
  video.muted = true;
  video.playsInline = true;

  video.addEventListener("ended", function () {
    video.currentTime = 0;

    var p = video.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () { return; });
    }
  });

  var playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(function () { return; });
  }
}

function setStatsTargets(creators, campaigns, blogs, testimonials) {
  var userBlogs = typeof Storage.getUserBlogs === "function" ? Storage.getUserBlogs() : [];

  if (Storage && typeof Storage.markActiveUserCounted === "function") {
    Storage.markActiveUserCounted();
  }

  var countedUsers = typeof Storage.getRegisteredUsersCount === "function" ? Storage.getRegisteredUsersCount() : 0;

  var baseUsers = Array.isArray(creators) ? creators.length : 0;

  var totalBlogs = (Array.isArray(blogs) ? blogs.length : 0) + (Array.isArray(userBlogs) ? userBlogs.length : 0);
  var values = [
    Array.isArray(creators) ? creators.length : 0,
    Array.isArray(campaigns) ? campaigns.length : 0,
    totalBlogs,
    baseUsers + countedUsers
  ];

  var boxes = document.querySelectorAll("#stats-section .stat-box");
  boxes.forEach(function (box, index) {
    box.setAttribute("data-target", String(values[index] || 0));
  });
}

function animateStats() {
  var boxes = document.querySelectorAll("#stats-section .stat-box");

  boxes.forEach(function (box) {
    var numEl = box.querySelector(".stat-number");
    var target = parseInt(box.getAttribute("data-target") || "0", 10);
    if (!numEl) return;

    var current = 0;
    var step = Math.max(1, Math.ceil(target / 60));

    function tick() {
      current += step;
      if (current >= target) {
        numEl.textContent = String(target);
        return;
      }
      numEl.textContent = String(current);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function setupStatsObserver() {
  var section = byId("stats-section");
  if (!section) return;

  var triggered = false;
  var observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !triggered) {
        triggered = true;
        animateStats();
        obs.unobserve(section);
      }
    });
  }, { threshold: 0.25 });

  observer.observe(section);
}

function renderTestimonials(testimonials) {
  var target = byId("testimonials-grid");
  if (!target) return;

  var items = Array.isArray(testimonials) ? testimonials : [];
  target.innerHTML = items.map(function (item) {
    var avatarSrc = Utils.normalizeAssetSrc(item && item.avatar ? item.avatar : "assets/images/profiles/ariana-flores-creator.jpg");
    return ""
      + '<article class="testimonial-card reveal">'
      + '  <blockquote>' + Utils.escapeHtml(item.quote || "") + "</blockquote>"
      + '  <div class="testimonial-author">'
      + '    <img src="' + Utils.escapeHtml(avatarSrc) + '" alt="' + Utils.escapeHtml(item.name || "Creator") + '">' 
      + "    <div>"
      + '      <p class="testimonial-author-name">' + Utils.escapeHtml(item.name || "") + "</p>"
      + '      <p class="testimonial-author-role">' + Utils.escapeHtml(item.designation || "") + "</p>"
      + "    </div>"
      + "  </div>"
      + "</article>";
  }).join("");
}

function startTimelineAutoScroll(trackEl) {
  if (!trackEl || trackEl.__aeAutoScrollAttached) return;
  trackEl.__aeAutoScrollAttached = true;

  var paused = false;
  var speedPxPerSecond = 42;
  var direction = 1;
  var lastPointerMoveAt = 0;
  var lastTickAt = null;

  function setPaused(value) {
    paused = !!value;
  }

  window.addEventListener("mousemove", function () {
    lastPointerMoveAt = Date.now();
  }, { passive: true });

  trackEl.addEventListener("mouseenter", function () {
    if (Date.now() - lastPointerMoveAt < 450) {
      setPaused(true);
    }
  });

  trackEl.addEventListener("mouseleave", function () {
    setPaused(false);
  });

  trackEl.addEventListener("focusin", function () { setPaused(true); });
  trackEl.addEventListener("focusout", function () { setPaused(false); });

  function tick(now) {
    try {
      if (lastTickAt == null) lastTickAt = now;
      var dt = Math.min(64, Math.max(0, now - lastTickAt));
      lastTickAt = now;

      if (!paused) {
        var maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
        if (maxScroll > 0) {
          trackEl.scrollLeft += (speedPxPerSecond * (dt / 1000)) * direction;

          if (trackEl.scrollLeft <= 0) {
            trackEl.scrollLeft = 0;
            direction = 1;
          } else if (trackEl.scrollLeft >= maxScroll) {
            trackEl.scrollLeft = maxScroll;
            direction = -1;
          }
        }
      }
    } catch (err) {
      console.warn("Timeline scroll error:", err);
    }
    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
}

function init() {
  ensureHeroVideoPlayback();

  if (Storage && Storage.isLoggedIn && Storage.isLoggedIn()) {
    var joinLink = byId("join-community-link");
    if (joinLink) joinLink.style.display = "none";
  }

  var track = document.querySelector(".timeline-track");
  if (track) {
    startTimelineAutoScroll(track);
  }

  Promise.all([
    Utils.fetchJson("data/campaigns.json"),
    Utils.fetchJson("data/blogs.json"),
    Utils.fetchJson("data/creators.json")
  ]).then(function (result) {
    var campaigns = Array.isArray(result[0]) ? result[0] : [];
    var blogs = Array.isArray(result[1]) ? result[1] : [];
    var creators = Array.isArray(result[2]) ? result[2] : [];
    var testimonials = creators.filter(function (c) { return c && c.isTestimonial; });

    setStatsTargets(creators, campaigns, blogs, testimonials);
    setupStatsObserver();
    renderTestimonials(testimonials);
    Utils.initRevealObserver();
  }).catch(function (err) {
    console.error("Failed to initialize about page:", err);
  });
}

Utils.onReady(init);
