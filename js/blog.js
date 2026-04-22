"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Router = window.Router;
var byId = Utils.byId;

var currentBlog = null;
var allBlogs = [];

function mergeBlogs(baseBlogs, userBlogs) {
  var map = {};
  var merged = [];

  baseBlogs.concat(userBlogs || []).forEach(function (blog) {
    if (!blog || blog.id == null) return;
    var key = String(blog.id);
    if (!key || map[key]) return;
    map[key] = true;
    merged.push(blog);
  });

  return merged;
}

function showNotFound() {
  var main = document.querySelector("main");
  if (!main) return;

  var exploreHref = Utils.appPath("pages/explore.html?tab=blogs");

  main.innerHTML = ''
    + '<section class="article-not-found">'
    + '  <h1>Article Not Found</h1>'
    + '  <p>The requested blog article could not be located.</p>'
      + '  <p><a class="btn btn-primary" href="' + Utils.escapeHtml(exploreHref) + '">Back to Explore</a></p>'
    + '</section>';
}

function renderSocialIcons(target) {
  if (!target) return;

  var blog = currentBlog;
  if (!blog) {
    target.style.display = "none";
    return;
  }

  var author = blog.author || {};
  var html = Utils.buildSocialLinks(author.socials, "dark");
  if (html) {
    target.innerHTML = html;
    target.style.display = "";
  } else {
    target.innerHTML = "";
    target.style.display = "none";
  }
}

function resolveAuthorCreatorId(blog) {
  var author = blog.author || {};
  var authorId = author.id || null;

  // Fix legacy blogs that stored "user-created" as the author ID
  if ((!authorId || authorId === "user-created") && blog.ownerIdentity) {
    return "user:" + String(blog.ownerIdentity).trim().toLowerCase();
  }

  return authorId;
}

function populateHeader(blog) {
  var author = blog.author || {};

  byId("article-category").textContent = blog.category || "Article";
  byId("article-date").textContent = Utils.formatShortDate(blog.publishedDate) || "Date TBD";
  byId("article-title").textContent = blog.title || "Untitled";

  byId("author-avatar").src = Utils.normalizeAssetSrc(author.avatar, "assets/images/profiles/ariana-flores-creator.jpg");
  byId("author-avatar").alt = (author.name || "Author") + " avatar";
  byId("author-name").textContent = author.name || "Adobe Team";
  byId("author-designation").textContent = author.designation || "Contributor";

  var authorId = resolveAuthorCreatorId(blog);
  var profileUrl = authorId ? Utils.appPath("pages/creator-profile.html?id=" + encodeURIComponent(authorId)) : "";
  var avatarLink = byId("author-avatar-link");
  var nameLink = byId("author-name-link");
  if (avatarLink) {
    if (profileUrl) {
      avatarLink.setAttribute("href", profileUrl);
    } else {
      avatarLink.removeAttribute("href");
    }
  }
  if (nameLink) {
    if (profileUrl) {
      nameLink.setAttribute("href", profileUrl);
    } else {
      nameLink.removeAttribute("href");
    }
  }

  renderSocialIcons(byId("author-socials"));

  byId("article-cover").src = Utils.normalizeAssetSrc(blog.coverImage, "assets/images/blogs/blog-runtime-cover-fallback.jpg");
  byId("article-cover").alt = blog.title || "Article cover";
}

function renderArticleBody(blog) {
  var bodyEl = byId("article-body");
  if (!bodyEl) return;
  bodyEl.innerHTML = "";

  // If it's a static blog from JSON, it has a content array.
  if (blog && Array.isArray(blog.content) && blog.content.length) {
    var coverNorm = Utils.normalizeAssetSrc(blog.coverImage || "", "");

    blog.content.forEach(function (block) {
      if (!block || !block.type) return;

      if (block.type === "heading") {
        var text = String(block.text || "");
        var lower = text.toLowerCase();
        var tag = lower.indexOf("sub") !== -1 || lower.indexOf(":") !== -1 ? "h3" : "h2";
        var h = document.createElement(tag);
        h.textContent = text;
        h.className = "reveal";
        bodyEl.appendChild(h);
        return;
      }

      if (block.type === "paragraph") {
        var p = document.createElement("p");
        p.textContent = String(block.text || "");
        p.className = "reveal";
        bodyEl.appendChild(p);
        return;
      }

      if (block.type === "image") {
        var inlineNorm = Utils.normalizeAssetSrc(block.src || "", "");
        if (coverNorm && inlineNorm && inlineNorm === coverNorm) {
          return;
        }

        if (!inlineNorm) return;

        var figure = document.createElement("figure");
        figure.className = "reveal";

        var img = document.createElement("img");
        img.src = inlineNorm;
        img.alt = block.alt || "Article image";

        var figcap = document.createElement("figcaption");
        figcap.textContent = block.alt || "";

        figure.appendChild(img);
        figure.appendChild(figcap);
        bodyEl.appendChild(figure);
      }
    });

    return;
  }

  // If it's a user blog, it has a plain text body.
  var rawBody = String((blog && blog.body) || "").trim();
  if (!rawBody) return;

  rawBody.split(/\n\s*\n+/).forEach(function (chunk) {
    var text = String(chunk || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    var p = document.createElement("p");
    p.textContent = text;
    p.className = "reveal";
    bodyEl.appendChild(p);
  });
}

function populateAuthorBio(blog) {
  var author = blog.author || {};
  byId("author-bio-avatar").src = Utils.normalizeAssetSrc(author.avatar, "assets/images/profiles/ariana-flores-creator.jpg");
  byId("author-bio-avatar").alt = (author.name || "Author") + " profile photo";
  byId("author-bio-name").textContent = author.name || "Adobe Team";
  byId("author-bio-designation").textContent = author.designation || "Contributor";
  byId("author-bio-text").textContent = author.bio || "";

  var authorId = resolveAuthorCreatorId(blog);
  var profileUrl = authorId ? Utils.appPath("pages/creator-profile.html?id=" + encodeURIComponent(authorId)) : "";
  var avatarLink = byId("author-bio-avatar-link");
  var nameLink = byId("author-bio-name-link");
  if (avatarLink) {
    if (profileUrl) {
      avatarLink.setAttribute("href", profileUrl);
    } else {
      avatarLink.removeAttribute("href");
    }
  }
  if (nameLink) {
    if (profileUrl) {
      nameLink.setAttribute("href", profileUrl);
    } else {
      nameLink.removeAttribute("href");
    }
  }

  renderSocialIcons(byId("author-bio-socials"));
}

function setSaveButtonState(saved) {
  var button = byId("save-blog-btn");
  if (!button) return;
  var label = button.querySelector(".save-label");

  button.classList.toggle("saved", !!saved);
  if (label) {
    label.textContent = saved ? "Saved" : "Save Article";
  }
}

function setupSaveButton(blogId) {
  var button = byId("save-blog-btn");
  if (!button) return;

  if (Storage.isLoggedIn()) {
    setSaveButtonState(Storage.isBlogSaved(blogId));
  }

  button.addEventListener("click", function () {
    if (!Storage.isLoggedIn()) {
      Router.navigate(Router.buildRedirectLogin("blog", blogId));
      return;
    }

    if (Storage.isBlogSaved(blogId)) {
      Storage.unsaveBlog(blogId);
      setSaveButtonState(false);
      Utils.showToast("Article removed from saved.", "info");
    } else {
      Storage.saveBlog(blogId);
      setSaveButtonState(true);
      Utils.showToast("Article saved to your profile.", "success");
    }
  });
}

function formatTimestamp(ts) {
  var d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderCommentItem(comment) {
  var name = comment.authorName || "Anonymous";
  var designation = comment.authorDesignation || "";
  var avatar = Utils.normalizeAssetSrc(comment.authorAvatar || "", "assets/images/profiles/default-user.jpg");

  var designationHtml = designation
    ? '<span class="comment-designation">' + Utils.escapeHtml(designation) + '</span>'
    : "";

  return ''
    + '<article class="comment-item reveal">'
      + '  <img class="comment-avatar" src="' + Utils.escapeHtml(avatar) + '" alt="' + Utils.escapeHtml(name) + '">' 
    + '  <div class="comment-body">'
    + '    <div class="comment-meta">'
    + '      <div class="comment-author-line">'
      + '        <span class="comment-author">' + Utils.escapeHtml(name) + '</span>'
    + '        ' + designationHtml
    + '      </div>'
      + '      <div class="comment-timestamp">' + Utils.escapeHtml(formatTimestamp(comment.timestamp)) + '</div>'
    + '    </div>'
      + '    <p class="comment-text">' + Utils.escapeHtml(comment.text || "") + '</p>'
    + '  </div>'
    + '</article>';
}

function updateCommentCount(comments) {
  var count = Array.isArray(comments) ? comments.length : 0;
  byId("comment-count").textContent = count + (count === 1 ? " Comment" : " Comments");
}

function renderComments(blogId) {
  var comments = Storage.getComments(blogId) || [];
  var list = byId("comments-list");

  if (!comments.length) {
    list.innerHTML = '<p class="text-muted">No comments yet. Start the discussion.</p>';
  } else {
    list.innerHTML = comments.map(renderCommentItem).join("");
  }

  updateCommentCount(comments);
}

function seedDefaultComments(blogId, creators, blog) {
  var existing = Storage.getComments(blogId) || [];
  if (existing.length) return;

  if (blog && blog.userSubmitted) return;
  if (String(blogId).indexOf("user-blog-") === 0) return;

  if (!Array.isArray(creators) || creators.length < 1) return;

  var digits = String(blogId).replace(/\D/g, "");
  var start = parseInt(digits, 10);
  if (Number.isNaN(start)) start = 0;

  var picks = [];
  for (var i = 0; i < creators.length && picks.length < 3; i++) {
    picks.push(creators[(start + i * 3) % creators.length]);
  }

  var title = blog && blog.title ? String(blog.title) : "this article";

  var texts = [
    "Really appreciated the clarity in how you framed \"" + title + "\". The workflow notes feel practical.",
    "Strong takeaways here, especially around consistency and iteration. I'd love a follow-up with a few concrete templates.",
    "The examples made this easy to apply. Curious how you'd adapt it for smaller teams and solo creators."
  ];

  var now = Date.now();
  var defaults = picks.map(function (c, idx) {
    return {
      id: now - (idx + 1) * 60000,
      authorName: c.name || "",
      authorDesignation: c.designation || "",
      authorAvatar: Utils.normalizeAssetSrc(c.avatar, "assets/images/profiles/default-user.jpg"),
      text: texts[idx] || "Great read. Thanks for sharing.",
      timestamp: new Date(now - (idx + 1) * 3600000).toISOString()
    };
  });

  for (var j = defaults.length - 1; j >= 0; j--) {
    Storage.addComment(blogId, defaults[j]);
  }
}

function setupCommentComposer(blogId) {
  var input = byId("comment-input");
  var charCount = byId("char-count");
  var postBtn = byId("post-comment-btn");
  var errorEl = byId("comment-error");

  function syncCount() {
    charCount.textContent = input.value.length + "/500";
  }

  input.addEventListener("input", syncCount);
  syncCount();

  postBtn.addEventListener("click", function () {
    errorEl.textContent = "";

    if (!Storage.isLoggedIn()) {
      Router.navigate(Router.buildRedirectLogin("blog", blogId));
      return;
    }

    var text = input.value.trim();
    if (!text) {
      errorEl.textContent = "Comment cannot be empty";
      return;
    }

    var user = Storage.getUser() || {};
    var comment = {
      id: Date.now(),
      authorName: user.name || "Anonymous",
      authorDesignation: user.designation || user.role || "",
      authorAvatar: Utils.normalizeAssetSrc(user.avatarSrc || user.avatar || "", "assets/images/profiles/default-user.jpg"),
      text: text,
      timestamp: new Date().toISOString()
    };

    Storage.addComment(blogId, comment);
    input.value = "";
    syncCount();

    var list = byId("comments-list");
    var existingEmpty = list.querySelector(".text-muted");
    if (existingEmpty) {
      list.innerHTML = "";
    }

    list.insertAdjacentHTML("afterbegin", renderCommentItem(comment));
    var inserted = list.firstElementChild;
    if (inserted) {
      inserted.classList.add("visible");
      inserted.classList.remove("reveal");
    }
    updateCommentCount(Storage.getComments(blogId));
    Utils.showToast("Comment posted.", "success", 1800);
  });
}

function renderRelatedArticles(blog) {
  var target = byId("related-articles-grid");
  if (!target) return;

  var related = allBlogs
    .filter(function (item) {
      return item.id !== blog.id && item.category === blog.category;
    })
    .slice(0, 3);

  if (!related.length) {
    target.innerHTML = '<p class="text-muted">No related articles found.</p>';
    return;
  }

  target.innerHTML = related.map(function (item) {
    return Utils.buildBlogCard(item);
  }).join("");
}

function init() {
  var blogId = Router.getParam("id");
  if (!blogId) {
    Router.navigate("pages/explore.html?tab=blogs");
    return;
  }

  Promise.all([
    Utils.fetchJson("data/blogs.json"),
    Utils.fetchJson("data/creators.json")
  ]).then(function (result) {
    var blogs = Array.isArray(result[0]) ? result[0] : [];
    var creators = Array.isArray(result[1]) ? result[1] : [];
    var userBlogs = Storage.getUserBlogs() || [];
    allBlogs = mergeBlogs(blogs, userBlogs);

    currentBlog = allBlogs.find(function (item) {
      return item && String(item.id) === String(blogId);
    }) || null;

    if (!currentBlog) {
      showNotFound();
      return;
    }

    populateHeader(currentBlog);
    renderArticleBody(currentBlog);
    populateAuthorBio(currentBlog);
    setupSaveButton(blogId);
    seedDefaultComments(blogId, creators, currentBlog);
    renderComments(blogId);
    setupCommentComposer(blogId);
    renderRelatedArticles(currentBlog);
    Utils.initRevealObserver();
  }).catch(function (err) {
    console.error("Failed to load blog page:", err);
    showNotFound();
  });
}

Utils.onReady(init);
