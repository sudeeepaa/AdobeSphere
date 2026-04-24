"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Router = window.Router;
var Auth = window.Auth;
function isSafeImageSrc(src) {
  var value = String(src || "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^(\/|\.{1,2}[\\/]|assets[\\/])/i.test(value)) return true;
  return false;
}

var byId = Utils.byId;
var editingBlogId = null;
var DEFAULT_CATEGORY = "Community / Events / Creator Programs";
var OTHER_VALUE = "__other__";

function plainTextFromContent(contentBlocks) {
  var blocks = Array.isArray(contentBlocks) ? contentBlocks : [];
  return blocks
    .filter(function (b) { return b && b.type === "paragraph" && String(b.text || "").trim(); })
    .map(function (b) { return String(b.text || "").trim(); })
    .join("\n\n");
}

function getExcerptFromText(text) {
  var raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "User submitted article from Adobesphere.";
  return raw.slice(0, 200);
}

function loadBlogForEdit(blogId) {
  var blog = Storage.getUserBlogById(blogId);
  if (!blog) return false;

  editingBlogId = blog.id;

  var titleInput = byId("blog-heading");
  var bodyInput = byId("blog-body");
  var categoryInput = byId("blog-category");
  var otherCategoryInput = byId("blog-category-other");
  var imageInput = byId("blog-image");
  var submitBtn = byId("blog-submit");

  if (titleInput) titleInput.value = blog.title || "";
  if (bodyInput) bodyInput.value = typeof blog.body === "string" ? blog.body : plainTextFromContent(blog.content);
  if (categoryInput) {
    var cat = String(blog.category || "").trim();
    if (!cat) {
      categoryInput.value = DEFAULT_CATEGORY;
      if (otherCategoryInput) otherCategoryInput.style.display = "none";
    } else {
      var optionExists = Array.prototype.slice.call(categoryInput.options || []).some(function (opt) {
        return opt && String(opt.value) === cat;
      });

      if (optionExists) {
        categoryInput.value = cat;
        if (otherCategoryInput) otherCategoryInput.style.display = "none";
      } else {
        categoryInput.value = OTHER_VALUE;
        if (otherCategoryInput) {
          otherCategoryInput.style.display = "block";
          otherCategoryInput.value = cat;
        }
      }
    }
  }
  if (imageInput) imageInput.value = blog.coverImage || "";
  if (submitBtn) submitBtn.textContent = "Update Blog";

  return true;
}

function setupSubmit() {
  var form = byId("blog-editor-form");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var title = (byId("blog-heading").value || "").trim();
    var body = (byId("blog-body").value || "").trim();
    var categorySelect = byId("blog-category");
    var otherCategoryInput = byId("blog-category-other");
    var categoryValue = categorySelect ? String(categorySelect.value || "").trim() : "";
    var imageLink = (byId("blog-image").value || "").trim();

    if (!title) {
      Utils.showToast("Please enter a heading.", "error", 2200);
      return;
    }

    if (!body) {
      Utils.showToast("Please write something for your blog.", "error", 2200);
      return;
    }

    if (imageLink && !isSafeImageSrc(imageLink)) {
      Utils.showToast("Please use an https:// image link or an assets/ image path (base64 images are not supported).", "error", 3000);
      return;
    }

    var category = "";
    if (categoryValue === OTHER_VALUE) {
      category = String((otherCategoryInput && otherCategoryInput.value) || "").trim();
      if (!category) {
        Utils.showToast("Please enter a category name.", "error", 2200);
        if (otherCategoryInput) otherCategoryInput.focus();
        return;
      }
      if (Storage && typeof Storage.addBlogCategory === "function") {
        Storage.addBlogCategory(category);
      }

      if (categorySelect) {
        var hasOption = Array.prototype.slice.call(categorySelect.options || []).some(function (opt) {
          return opt && String(opt.value) === category;
        });

        if (!hasOption) {
          var otherOptIndex = Array.prototype.slice.call(categorySelect.options || []).findIndex(function (opt) {
            return opt && String(opt.value) === OTHER_VALUE;
          });
          var option = document.createElement("option");
          option.value = category;
          option.textContent = category;
          if (otherOptIndex >= 0) {
            categorySelect.insertBefore(option, categorySelect.options[otherOptIndex]);
          } else {
            categorySelect.appendChild(option);
          }
        }

        categorySelect.value = category;
        if (otherCategoryInput) otherCategoryInput.style.display = "none";
      }
    } else {
      category = categoryValue;
    }

    var user = Storage.getUser();
    if (!user || !Storage.isLoggedIn || !Storage.isLoggedIn()) {
      Utils.showToast("Please sign in before publishing.", "error", 2400);
      Router.navigate("pages/login.html");
      return;
    }
    var existing = editingBlogId ? Storage.getUserBlogById(editingBlogId) : null;
    var blogId = editingBlogId || Utils.generateId("user-blog");
    var publishedDate = existing && existing.publishedDate ? existing.publishedDate : new Date().toISOString().slice(0, 10);

    var ownerIdentity = (Storage && typeof Storage.getActiveUserIdentity === "function")
      ? Storage.getActiveUserIdentity()
      : String((user && user.email) || "").trim().toLowerCase();

    var authorCreatorId = ownerIdentity ? "user:" + ownerIdentity : "user-created";

    var excerpt = getExcerptFromText(body).slice(0, 120);

    var blogObj = {
      id: blogId,
      title: title,
      category: category || (existing && existing.category) || DEFAULT_CATEGORY,
      ownerIdentity: ownerIdentity,
      author: {
        id: authorCreatorId,
        name: user && user.name ? user.name : "Community Author",
        designation: user && user.designation ? user.designation : "Community Contributor",
        avatar: user && user.avatarSrc ? user.avatarSrc : "assets/images/profiles/default-user.jpg",
        bio: user && user.bio ? user.bio : "Adobesphere community member.",
        socials: user && user.socials ? user.socials : { linkedin: "#" }
      },
      publishedDate: publishedDate,
      coverImage: imageLink,
      excerpt: excerpt,
      body: body,
      featured: false,
      userSubmitted: true
    };

    if (editingBlogId) {
      Storage.updateUserBlog(blogObj);
    } else {
      Storage.addUserBlog(blogObj);
    }

    var saved = Storage.getUserBlogById(blogObj.id);
    if (!saved) {
      Utils.showToast("Could not save your blog. Please try again.", "error", 2800);
      return;
    }

    Utils.showToast(editingBlogId ? "Blog updated." : "Blog published.", "success", 2200);

    if (user && typeof Storage.updateUser === "function") {
      var myBlogs = Array.isArray(user.myBlogs) ? user.myBlogs.slice() : [];
      if (myBlogs.indexOf(blogObj.id) === -1) {
        myBlogs.push(blogObj.id);
      }
      Storage.updateUser({ myBlogs: myBlogs });
    }

    setTimeout(function () {
      Router.navigate("pages/blog.html?id=" + encodeURIComponent(blogObj.id));
    }, 900);
  });
}

function init() {
  Auth.guardPage("blog-editor");

  var editId = Router.getParam("id") || "";
  setupCategorySelect().then(function () {
    if (editId) {
      loadBlogForEdit(editId);
    } else {
      var categorySelect = byId("blog-category");
      if (categorySelect && !categorySelect.value) {
        categorySelect.value = DEFAULT_CATEGORY;
      }
    }
  });

  setupSubmit();
}

function setupCategorySelect() {
  var select = byId("blog-category");
  var otherInput = byId("blog-category-other");
  if (!select) return Promise.resolve();

  function setOtherVisible(visible) {
    if (!otherInput) return;
    otherInput.style.display = visible ? "block" : "none";
    if (!visible) otherInput.value = "";
  }

  select.addEventListener("change", function () {
    setOtherVisible(String(select.value) === OTHER_VALUE);
    if (String(select.value) === OTHER_VALUE && otherInput) {
      otherInput.focus();
    }
  });

  function uniquePush(list, map, value) {
    var val = String(value || "").trim();
    if (!val) return;
    var key = val.toLowerCase();
    if (map[key]) return;
    map[key] = true;
    list.push(val);
  }

  function renderOptions(categories) {
    var current = String(select.value || "");
    var safeCategories = Array.isArray(categories) ? categories : [];

    var html = '';
    safeCategories.forEach(function (c) {
      html += '<option value="' + Utils.escapeHtml(c) + '">' + Utils.escapeHtml(c) + '</option>';
    });
    html += '<option value="' + OTHER_VALUE + '">Other…</option>';

    select.innerHTML = html;

    // restore selection if possible
    if (current && Array.prototype.slice.call(select.options).some(function (opt) { return opt.value === current; })) {
      select.value = current;
    }
  }

  // Build category list from built-in blogs + user blogs + stored custom categories.
  return Utils.fetchJson("data/blogs.json").then(function (blogs) {
    var base = Array.isArray(blogs) ? blogs : [];
    var userBlogs = (Storage && typeof Storage.getUserBlogs === "function") ? (Storage.getUserBlogs() || []) : [];
    var stored = (Storage && typeof Storage.getBlogCategories === "function") ? (Storage.getBlogCategories() || []) : [];

    var list = [];
    var seen = {};

    base.concat(userBlogs).forEach(function (b) {
      uniquePush(list, seen, b && b.category);
    });
    stored.forEach(function (c) {
      uniquePush(list, seen, c);
    });

    uniquePush(list, seen, DEFAULT_CATEGORY);

    list.sort(function (a, b) {
      return String(a).localeCompare(String(b));
    });

    renderOptions(list);
    setOtherVisible(String(select.value) === OTHER_VALUE);
  }).catch(function () {
    var stored = (Storage && typeof Storage.getBlogCategories === "function") ? (Storage.getBlogCategories() || []) : [];
    var list = [DEFAULT_CATEGORY].concat(stored);
    var seen = {};
    list = list.filter(function (c) {
      var key = String(c || "").trim().toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (a, b) {
      return String(a).localeCompare(String(b));
    });

    renderOptions(list);
    setOtherVisible(String(select.value) === OTHER_VALUE);
  });
}

Utils.onReady(init);
