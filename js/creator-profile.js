"use strict";

var Utils = window.Utils;
var Router = window.Router;
var Storage = window.Storage;
var byId = Utils.byId;

function showNotFound() {
  var main = document.querySelector("main");
  if (!main) return;

  var backHref = Utils.appPath("pages/explore.html?tab=creators");

  main.innerHTML = ''
    + '<section class="not-found-state">'
    + '  <h1>Creator Not Found</h1>'
    + '  <p>We could not find the creator profile you requested.</p>'
      + '  <p><a class="btn btn-primary" href="' + Utils.escapeHtml(backHref) + '">Back to Creators</a></p>'
    + '</section>';
}

function populateHeader(creator) {
  var avatarEl = byId("creator-avatar");
  var nameEl = byId("creator-name");
  var designationEl = byId("creator-designation");

  if (avatarEl) {
    avatarEl.src = Utils.normalizeAssetSrc(creator.avatar, "assets/images/profiles/ariana-flores-creator.jpg");
    avatarEl.alt = (creator.name || "Creator") + " avatar";
  }

  if (nameEl) nameEl.textContent = creator.name || "Creator";
  if (designationEl) designationEl.textContent = creator.designation || "";

  var blogsCount = creator.blogIds && creator.blogIds.length ? creator.blogIds.length : (creator.stats && creator.stats.blogsPublished) || 0;
  var eventsCount = creator.eventIds && creator.eventIds.length ? creator.eventIds.length : (creator.stats && creator.stats.eventsHosted) || 0;
  var testimonialsCount = creator.stats && creator.stats.testimonialsGiven || 0;

  var blogsEl = byId("stat-blogs");
  var eventsEl = byId("stat-events");
  var testimonialsEl = byId("stat-testimonials");

  if (blogsEl) blogsEl.textContent = blogsCount;
  if (eventsEl) eventsEl.textContent = eventsCount;
  if (testimonialsEl) testimonialsEl.textContent = testimonialsCount;
}

function populateBio(creator) {
  var container = byId("creator-full-bio");
  var fullBio = String(creator.fullBio || creator.bio || "").trim();

  if (!fullBio) {
    container.innerHTML = '<p class="text-muted">Bio coming soon.</p>';
    return;
  }

  var paragraphs = fullBio
    .split(/\n\s*\n/)
    .map(function (p) { return p.trim(); })
    .filter(Boolean);

  container.innerHTML = paragraphs.map(function (paragraph) {
    return '<p>' + Utils.escapeHtml(paragraph) + '</p>';
  }).join("");
}

function renderReachOut(creator) {
  var section = byId("creator-reach-out");
  var holder = byId("creator-reach-out-links");
  if (!section || !holder) return;

  var emailRaw = creator && creator.email ? String(creator.email).trim() : "";
  var hasEmail = Utils.validateEmail(emailRaw);

  var linkedinRaw = creator && creator.socials && creator.socials.linkedin ? String(creator.socials.linkedin).trim() : "";
  var linkedinUrl = Utils.safeExternalUrl(linkedinRaw);
  var hasLinkedin = /^https:\/\/(www\.)?linkedin\.com\//i.test(linkedinUrl);

  if (!hasEmail && !hasLinkedin) {
    section.style.display = "none";
    holder.innerHTML = "";
    return;
  }

  var chunks = [];

  if (hasEmail) {
    chunks.push(''
      + '<a class="creator-contact-pill creator-contact-pill--email" href="mailto:' + Utils.escapeHtml(emailRaw) + '" aria-label="Email creator">'
      + '  <span class="creator-contact-pill__icon" aria-hidden="true">'
      + '    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m22 6-10 7L2 6"></path></svg>'
      + '  </span>'
      + '  <span>' + Utils.escapeHtml(emailRaw) + '</span>'
      + '</a>');
  }

  if (hasLinkedin) {
    chunks.push(''
      + '<a class="creator-contact-pill creator-contact-pill--linkedin" href="' + Utils.escapeHtml(linkedinUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Visit LinkedIn profile">'
      + '  <span class="creator-contact-pill__icon" aria-hidden="true">'
      + '    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3A1.97 1.97 0 1 0 5.2 6.94 1.97 1.97 0 0 0 5.25 3zM20.44 13.6c0-3.37-1.8-4.94-4.2-4.94-1.93 0-2.8 1.06-3.28 1.8V8.5H9.58V20h3.38v-6.14c0-1.62.3-3.2 2.3-3.2 1.98 0 2.01 1.85 2.01 3.3V20h3.37v-6.4z"></path></svg>'
      + '  </span>'
      + '  <span>Connect on LinkedIn</span>'
      + '</a>');
  }

  section.style.display = "block";
  holder.innerHTML = '<div class="creator-contact-list">' + chunks.join("") + '</div>';
}

function renderEventsGrid(creator, campaigns) {
  var target = byId("creator-events-grid");
  var ids = creator.eventIds || [];

  var items = campaigns.filter(function (eventItem) {
    return ids.indexOf(eventItem.id) !== -1;
  });

  if (!items.length) {
    target.innerHTML = '<div class="empty-state">No events yet</div>';
    return;
  }

  target.innerHTML = items.map(function (item) {
    return Utils.buildEventCard(item);
  }).join("");
}

function renderBlogsGrid(creator, blogs) {
  var target = byId("creator-blogs-grid");
  var ids = creator.blogIds || [];

  var idsMap = {};
  ids.forEach(function (id) {
    var key = String(id);
    if (key) idsMap[key] = true;
  });

  var items = blogs.filter(function (blogItem) {
    if (!blogItem || typeof blogItem.id === "undefined" || blogItem.id === null) return false;
    return !!idsMap[String(blogItem.id)];
  });

  if (!items.length) {
    target.innerHTML = '<div class="empty-state">No blogs yet</div>';
    return;
  }

  target.innerHTML = items.map(function (item) {
    return Utils.buildBlogCard(item);
  }).join("");
}

function renderQuote(creator) {
  var quoteSection = byId("creator-quote");
  var quoteText = byId("creator-quote-text");

  if (!creator.featuredQuote) {
    quoteSection.style.display = "none";
    return;
  }

  quoteSection.style.display = "block";
  quoteText.textContent = creator.featuredQuote;
}

function init() {
  var creatorId = Router.getParam("id");
  if (!creatorId) {
    Router.navigate("pages/explore.html?tab=creators");
    return;
  }

  Promise.all([
    Utils.fetchJson("data/creators.json"),
    Utils.fetchJson("data/campaigns.json"),
    Utils.fetchJson("data/blogs.json")
  ]).then(function (result) {
    var creators = Array.isArray(result[0]) ? result[0] : [];
    var campaigns = Array.isArray(result[1]) ? result[1] : [];
    var blogs = Array.isArray(result[2]) ? result[2] : [];

    if (Storage && typeof Storage.getUserBlogs === "function") {
      var userBlogs = Storage.getUserBlogs() || [];
      var seenBlogs = {};
      var mergedBlogs = [];

      blogs.concat(userBlogs).forEach(function (blog) {
        if (!blog || typeof blog.id === "undefined" || blog.id === null) return;
        var key = String(blog.id);
        if (!key || seenBlogs[key]) return;
        seenBlogs[key] = true;
        mergedBlogs.push(blog);
      });

      blogs = mergedBlogs;
    }

    if (Storage && typeof Storage.getUserCreators === "function") {
      creators = creators.concat(Storage.getUserCreators() || []);
    }

    var creator = creators.find(function (item) {
      return item.id === creatorId;
    }) || null;

    if (!creator) {
      showNotFound();
      return;
    }

    document.title = (creator.name || "Creator") + " — Adobesphere";

    populateHeader(creator);
    populateBio(creator);
    renderReachOut(creator);
    renderEventsGrid(creator, campaigns);
    renderBlogsGrid(creator, blogs);
    renderQuote(creator);
    Utils.initRevealObserver();
  }).catch(function (err) {
    console.error("Failed loading creator profile:", err);
    showNotFound();
  });
}

Utils.onReady(init);
