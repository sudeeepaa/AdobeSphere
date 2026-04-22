"use strict";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoString) {
  var d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(d);
}

function formatShortDate(isoString) {
  var d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(d);
}

function truncate(text, maxLength) {
  var str = String(text ?? "");
  var max = Math.max(0, Number(maxLength) || 0);
  if (!max || str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function generateId(prefix) {
  var pre = String(prefix || "item").trim() || "item";
  return pre + "-" + Date.now();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validateUrl(url) {
  var str = String(url || "").trim();
  return /^https:\/\/.+\..+/.test(str);
}

function appPath(path) {
  if (!path) return "";
  if (path.startsWith("#") || path.startsWith("?")) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  return "/" + path;
}

function safeExternalUrl(url) {
  var value = String(url || "").trim();
  if (!value) return "";

  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  return "";
}

function fetchJson(pathLike, init) {
  var url = appPath(pathLike);
  return fetch(url, init).then(function (res) {
    if (!res || !res.ok) {
      var status = res ? res.status : 0;
      throw new Error("FETCH_FAILED_" + String(status));
    }
    return res.json();
  });
}

function normalizeAssetSrc(src, fallback) {
  if (!src || typeof src !== "string" || src.trim() === "") return fallback || "";
  var val = src.trim();
  if (val.startsWith("data:")) return val;
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  return appPath(val);
}

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      reject(new Error("FILE_REQUIRED"));
      return;
    }

    var reader = new FileReader();
    reader.onload = function (event) {
      resolve(String((event.target && event.target.result) || ""));
    };
    reader.onerror = function () {
      reject(new Error("FILE_READ_FAILED"));
    };
    reader.readAsDataURL(file);
  });
}

function showToast(message, type, duration) {
  var toastType = ["success", "error", "info"].indexOf(type) !== -1 ? type : "info";
  var timeout = typeof duration === "number" ? duration : 3000;

  var container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "toast toast-" + toastType;
  toast.textContent = String(message ?? "");

  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("show");
  }, 50);

  setTimeout(function () {
    toast.classList.remove("show");
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, timeout);
}

function buildEventCard(eventItem) {
  var eventObj = eventItem || {};
  var location = [
    eventObj.location && eventObj.location.city,
    eventObj.location && eventObj.location.state
  ].filter(Boolean).join(", ");

  var thumbSrc = normalizeAssetSrc(eventObj.thumbnail);

  var href = appPath("pages/event.html?id=" + encodeURIComponent(eventObj.id || ""));

  return ""
    + '<article class="card reveal">'
    + '  <a class="card__full-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(eventObj.title || "Event") + '"></a>'
    + (thumbSrc ? '  <img class="card__image" src="' + escapeHtml(thumbSrc) + '" alt="' + escapeHtml(eventObj.title || "Event") + '">' : "")
    + '  <div class="card__body">'
    + '    <span class="badge">' + escapeHtml(eventObj.category || "Event") + "</span>"
    + '    <h3 class="card__title">' + escapeHtml(eventObj.title || "Untitled Event") + "</h3>"
    + '    <div class="card__meta"><span>' + escapeHtml(formatShortDate(eventObj.date || "")) + "</span><span>" + escapeHtml(location || "TBD") + "</span></div>"
    + '    <p class="card__excerpt">' + escapeHtml(eventObj.shortDescription || "") + "</p>"
    + "  </div>"
    + "</article>";
}

function buildBlogCard(blogItem) {
  var blog = blogItem || {};
  var author = blog.author || {};

  var coverSrc = normalizeAssetSrc(blog.coverImage);
  var authorAvatarSrc = normalizeAssetSrc(author.avatar);

  var href = appPath("pages/blog.html?id=" + encodeURIComponent(blog.id || ""));

  var resolvedAuthorId = author.id;
  if ((!resolvedAuthorId || resolvedAuthorId === "user-created") && blog.ownerIdentity) {
    resolvedAuthorId = "user:" + String(blog.ownerIdentity).trim().toLowerCase();
  }

  var authorHref = resolvedAuthorId
    ? escapeHtml(appPath("pages/creator-profile.html?id=" + encodeURIComponent(resolvedAuthorId)))
    : "";
  var authorTag = authorHref
    ? '<a class="blog-author-inline" href="' + authorHref + '" style="position:relative;z-index:3">'
    : '<span class="blog-author-inline">';
  var authorClose = authorHref ? "</a>" : "</span>";

  return ""
    + '<article class="card reveal">'
    + '  <a class="card__full-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(blog.title || "Blog") + '"></a>'
    + (coverSrc ? '  <img class="card__image" src="' + escapeHtml(coverSrc) + '" alt="' + escapeHtml(blog.title || "Blog") + '">' : "")
    + '  <div class="card__body">'
    + '    <span class="badge badge--outline">' + escapeHtml(blog.category || "Article") + "</span>"
    + '    <h3 class="card__title">' + escapeHtml(blog.title || "Untitled Article") + "</h3>"
    + '    <div class="card__meta">'
    + "      " + authorTag
    + (authorAvatarSrc ? '<img src="' + escapeHtml(authorAvatarSrc) + '" alt="' + escapeHtml(author.name || "Author") + '">' : "")
    + escapeHtml(author.name || "Author")
    + authorClose
    + '      <span>' + escapeHtml(formatShortDate(blog.publishedDate || "")) + "</span>"
    + "    </div>"
    + '    <p class="card__excerpt">' + escapeHtml(blog.excerpt || "") + "</p>"
    + "  </div>"
    + "</article>";
}

function buildCreatorCard(creatorItem) {
  var creator = creatorItem || {};

  var avatarSrc = normalizeAssetSrc(creator.avatar);

  var href = appPath("pages/creator-profile.html?id=" + encodeURIComponent(creator.id || ""));

  return ""
    + '<article class="card creator-card reveal">'
    + '  <a class="card__full-link" href="' + escapeHtml(href) + '" aria-label="' + escapeHtml(creator.name || "Creator") + '"></a>'
    + '  <div class="card__body">'
    + (avatarSrc ? '    <img class="creator-avatar" src="' + escapeHtml(avatarSrc) + '" alt="' + escapeHtml(creator.name || "Creator") + '">' : "")
    + '    <h3 class="card__title">' + escapeHtml(creator.name || "Unnamed Creator") + "</h3>"
    + '    <p class="text-muted">' + escapeHtml(creator.designation || "") + "</p>"
    + '    <p class="card__excerpt">' + escapeHtml(truncate(creator.bio || creator.fullBio || "", 100)) + "</p>"
    + "  </div>"
    + "</article>";
}

function buildSocialLinks(socials, theme) {
  var linkedinUrl = socials && socials.linkedin ? socials.linkedin.trim() : "";
  if (!linkedinUrl || !linkedinUrl.startsWith("https://")) return "";

  var styleClass = theme === "light" ? "social-link social-link--light" : "social-link social-link--dark";
  var icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3A1.97 1.97 0 1 0 5.2 6.94 1.97 1.97 0 0 0 5.25 3zM20.44 13.6c0-3.37-1.8-4.94-4.2-4.94-1.93 0-2.8 1.06-3.28 1.8V8.5H9.58V20h3.38v-6.14c0-1.62.3-3.2 2.3-3.2 1.98 0 2.01 1.85 2.01 3.3V20h3.37v-6.4z"></path></svg>';

  return '<a class="' + styleClass + '" href="' + linkedinUrl + '" target="_blank" rel="noopener noreferrer" aria-label="linkedin">' + icon + '</a>';
}

var _revealObserver = null;

function initRevealObserver() {
  var nodes = document.querySelectorAll(".reveal:not(.visible)");
  if (!nodes.length) return _revealObserver;

  if (!_revealObserver) {
    _revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  nodes.forEach(function (node) {
    _revealObserver.observe(node);
  });

  return _revealObserver;
}

function byId(id) {
  return document.getElementById(id);
}

function onReady(fn) {
  if (typeof fn !== "function") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

window.Utils = {
  byId: byId,
  onReady: onReady,
  escapeHtml: escapeHtml,
  appPath: appPath,
  safeExternalUrl: safeExternalUrl,
  fetchJson: fetchJson,
  normalizeAssetSrc: normalizeAssetSrc,
  formatDate: formatDate,
  formatShortDate: formatShortDate,
  truncate: truncate,
  generateId: generateId,
  validateEmail: validateEmail,
  validateUrl: validateUrl,
  fileToBase64: fileToBase64,
  showToast: showToast,
  buildEventCard: buildEventCard,
  buildBlogCard: buildBlogCard,
  buildCreatorCard: buildCreatorCard,
  buildSocialLinks: buildSocialLinks,
  initRevealObserver: initRevealObserver
};
