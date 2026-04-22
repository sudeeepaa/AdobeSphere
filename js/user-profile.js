"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Auth = window.Auth;
var byId = Utils.byId;

var state = {
  user: null,
  campaigns: [],
  blogs: [],
  savedTab: "events",
  editingProfile: false,
  pendingDeleteId: null
};

function openDeleteModal(blogId) {
  state.pendingDeleteId = blogId;
  var modal = byId("delete-blog-modal");
  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeDeleteModal() {
  state.pendingDeleteId = null;
  var modal = byId("delete-blog-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
}

function withCardActions(cardHtml, actionsHtml, prependHtml) {
  var holder = document.createElement("div");
  holder.innerHTML = cardHtml;
  var card = holder.firstElementChild;
  if (!card) return cardHtml;

  var body = card.querySelector(".card__body");
  if (!body) return card.outerHTML;

  if (prependHtml) {
    body.insertAdjacentHTML("afterbegin", prependHtml);
  }

  if (actionsHtml) {
    body.insertAdjacentHTML("beforeend", actionsHtml);
  }

  return card.outerHTML;
}

function getAvatarSrc(user) {
  var raw = (user.avatarSrc && String(user.avatarSrc).trim()) || "/assets/images/profiles/default-user.jpg";
  return Utils.normalizeAssetSrc(raw, "/assets/images/profiles/default-user.jpg");
}

function refreshUser() {
  state.user = Storage.getUser() || {};
}

function updateDisplayFromUser() {
  var user = state.user || {};

  byId("profile-avatar").src = getAvatarSrc(user);
  byId("profile-name-display").textContent = user.name || "Your Name";
  byId("profile-designation-display").textContent = user.designation || "Add your designation";
  byId("profile-bio-display").textContent = user.bio || "Add your short bio here.";

  byId("profile-name-input").value = user.name || "";
  byId("profile-designation-input").value = user.designation || "";
  byId("profile-bio-input").value = user.bio || "";

  var socials = user.socials || {};
  var linkedinInput = byId("social-linkedin");
  if (linkedinInput) {
    linkedinInput.value = socials.linkedin || "";
  }
}

function setEditMode(enabled) {
  state.editingProfile = !!enabled;

  byId("profile-name-display").style.display = enabled ? "none" : "block";
  byId("profile-designation-display").style.display = enabled ? "none" : "block";
  byId("profile-bio-display").style.display = enabled ? "none" : "block";

  byId("profile-name-input").style.display = enabled ? "block" : "none";
  byId("profile-designation-input").style.display = enabled ? "block" : "none";
  byId("profile-bio-input").style.display = enabled ? "block" : "none";

  byId("edit-profile-btn").style.display = enabled ? "none" : "inline-flex";
  byId("save-profile-btn").style.display = enabled ? "inline-flex" : "none";
}

function renderSavedEvents() {
  var target = byId("saved-events-grid");
  var ids = (state.user && state.user.savedEvents) || [];

  var items = state.campaigns.filter(function (eventItem) {
    return ids.indexOf(eventItem.id) !== -1;
  });

  if (!items.length) {
    var browseHref = Utils.appPath("pages/explore.html?tab=events");
    target.innerHTML = ""
      + '<div class="empty-state">'
      + "You haven\'t saved any events yet. "
      + '<a href="' + Utils.escapeHtml(browseHref) + '">Browse Events</a>'
      + "</div>";
    return;
  }

  target.innerHTML = items.map(function (item) {
    var card = Utils.buildEventCard(item);
    var actions = ''
      + '<div class="card__actions">'
      + '  <button class="btn btn-ghost js-unsave-event" data-id="' + Utils.escapeHtml(item.id) + '">Unsave</button>'
      + '</div>';
    return withCardActions(card, actions, "");
  }).join("");
}

function getAllBlogs() {
  var base = Array.isArray(state.blogs) ? state.blogs : [];
  var userBlogs = Storage.getUserBlogs() || [];

  var seen = {};
  var merged = [];

  base.concat(userBlogs).forEach(function (blog) {
    if (!blog || !blog.id || seen[blog.id]) return;
    seen[blog.id] = true;
    merged.push(blog);
  });

  return merged;
}

function renderSavedBlogs() {
  var target = byId("saved-blogs-grid");
  var ids = (state.user && state.user.savedBlogs) || [];

  var allBlogs = getAllBlogs();
  var items = allBlogs.filter(function (blogItem) {
    return ids.indexOf(blogItem.id) !== -1;
  });

  if (!items.length) {
    var browseHref = Utils.appPath("pages/explore.html?tab=blogs");
    target.innerHTML = ""
      + '<div class="empty-state">'
      + "You haven\'t saved any blogs yet. "
      + '<a href="' + Utils.escapeHtml(browseHref) + '">Browse Blogs</a>'
      + "</div>";
    return;
  }

  target.innerHTML = items.map(function (item) {
    var card = Utils.buildBlogCard(item);
    var actions = ''
      + '<div class="card__actions">'
      + '  <button class="btn btn-ghost js-unsave-blog" data-id="' + Utils.escapeHtml(item.id) + '">Unsave</button>'
      + '</div>';
    return withCardActions(card, actions, "");
  }).join("");
}

function renderRegisteredEvents() {
  var target = byId("registered-events-grid");
  var ids = (state.user && state.user.registeredEvents) || [];

  var items = state.campaigns.filter(function (eventItem) {
    return ids.indexOf(eventItem.id) !== -1;
  });

  if (!items.length) {
    target.innerHTML = '<div class="empty-state">No registrations yet.</div>';
    return;
  }

  target.innerHTML = items.map(function (item) {
    var card = Utils.buildEventCard(item);
    var actions = ''
      + '<div class="card__actions">'
      + '  <button class="btn btn-ghost js-unregister-event" data-id="' + Utils.escapeHtml(item.id) + '">Cancel Registration</button>'
      + '</div>';
    return withCardActions(card, actions, '<span class="status-badge">Registered</span>');
  }).join("");
}

function renderMyBlogs() {
  var target = byId("my-blogs-grid");
  var ownerIdentity = (Storage && typeof Storage.getActiveUserIdentity === "function")
    ? Storage.getActiveUserIdentity()
    : String((state.user && state.user.email) || "").trim().toLowerCase();

  var userBlogs = (Storage && typeof Storage.getUserBlogsByOwner === "function")
    ? (Storage.getUserBlogsByOwner(ownerIdentity) || [])
    : (Storage.getUserBlogs() || []);

  if (!userBlogs.length) {
    target.innerHTML = ""
      + '<div class="empty-state">'
      + '  <p>No blogs published yet.</p>'
      + "</div>";
    return;
  }

  target.innerHTML = userBlogs.map(function (item) {
    var cardActions = ''
      + '<div class="card__actions">'
      + '  <button class="btn btn-ghost delete-blog-btn js-delete-blog" data-id="' + Utils.escapeHtml(item.id) + '">Delete Blog</button>'
      + '</div>';

    var card = Utils.buildBlogCard(item);
    return withCardActions(card, cardActions, "");
  }).join("");
}

function renderAllLists() {
  refreshUser();
  renderSavedEvents();
  renderSavedBlogs();
  renderRegisteredEvents();
  renderMyBlogs();

  Utils.initRevealObserver();
}

function switchSavedTab(tabName) {
  state.savedTab = tabName === "blogs" ? "blogs" : "events";

  var eventsTab = byId("saved-events-tab");
  var blogsTab = byId("saved-blogs-tab");
  var eventsGrid = byId("saved-events-grid");
  var blogsGrid = byId("saved-blogs-grid");

  var showEvents = state.savedTab === "events";

  eventsTab.classList.toggle("active", showEvents);
  blogsTab.classList.toggle("active", !showEvents);

  eventsTab.setAttribute("aria-selected", showEvents ? "true" : "false");
  blogsTab.setAttribute("aria-selected", showEvents ? "false" : "true");

  eventsGrid.style.display = showEvents ? "grid" : "none";
  blogsGrid.style.display = showEvents ? "none" : "grid";
}

function handleAvatarUpload(file) {
  if (!file) return;

  var allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.indexOf(file.type) === -1) {
    Utils.showToast("Please upload a JPG, PNG, or WEBP image.", "error");
    return;
  }

  function resizeToAvatar(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var size = 200;
          var canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext("2d");

          var sw = img.naturalWidth || img.width;
          var sh = img.naturalHeight || img.height;
          if (!sw || !sh) {
            reject(new Error("INVALID_IMAGE_DIMENSIONS"));
            return;
          }

          var side = Math.min(sw, sh);
          var sx = Math.floor((sw - side) / 2);
          var sy = Math.floor((sh - side) / 2);

          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

          var out = canvas.toDataURL("image/jpeg", 0.7);
          resolve(out);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = function () {
        reject(new Error("IMAGE_LOAD_FAILED"));
      };
      img.src = dataUrl;
    });
  }

  Utils.fileToBase64(file).then(function (src) {
    if (!src) return;

    if (String(src).length > 150000) {
      return resizeToAvatar(src).then(function (resized) {
        Utils.showToast("Image resized to fit storage limits.", "info");
        return resized;
      }).catch(function () {
        return src;
      });
    }

    return src;
  }).then(function (finalSrc) {
    if (!finalSrc) return;

    Storage.updateUser({ avatarSrc: finalSrc });
    refreshUser();
    byId("profile-avatar").src = finalSrc;
    Utils.showToast("Profile photo updated!", "success");
    Auth.updateNavbar();
  }).catch(function () {
    Utils.showToast("Failed to process image.", "error");
  });
}

function saveProfile() {
  var name = byId("profile-name-input").value.trim();
  var designation = byId("profile-designation-input").value.trim();
  var bio = byId("profile-bio-input").value.trim();

  if (!name) {
    Utils.showToast("Name is required.", "error");
    byId("profile-name-input").focus();
    return;
  }

  var linkedinValue = byId("social-linkedin").value.trim();
  if (linkedinValue) {
    if (!Utils.validateUrl(linkedinValue)) {
      Utils.showToast("LinkedIn URL must start with https://", "error");
      byId("social-linkedin").focus();
      return;
    }
  }

  var socials = {
    linkedin: linkedinValue
  };

  Storage.updateUser({
    name: name,
    designation: designation,
    bio: bio,
    socials: socials
  });

  refreshUser();
  updateDisplayFromUser();
  setEditMode(false);
  Utils.showToast("Profile updated!", "success");

  Auth.updateNavbar();
}

function handleSectionHash() {
  if (window.location.hash === "#saved") {
    byId("saved-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (window.location.hash === "#my-blogs") {
    byId("my-blogs-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function bindEvents() {
  byId("edit-profile-btn").addEventListener("click", function () {
    setEditMode(true);
  });

  byId("save-profile-btn").addEventListener("click", function () {
    saveProfile();
  });

  byId("avatar-input").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    handleAvatarUpload(file);
    event.target.value = "";
  });

  byId("saved-tabs").addEventListener("click", function (event) {
    var btn = event.target.closest("[data-saved-tab]");
    if (!btn) return;
    switchSavedTab(btn.getAttribute("data-saved-tab"));
  });

  byId("saved-events-grid").addEventListener("click", function (event) {
    var btn = event.target.closest(".js-unsave-event");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    var id = btn.getAttribute("data-id");
    if (!id) return;

    Storage.unsaveEvent(id);
    renderAllLists();
    Utils.showToast("Event removed from saved.", "info");
  });

  byId("registered-events-grid").addEventListener("click", function (event) {
    var btn = event.target.closest(".js-unregister-event");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    var id = btn.getAttribute("data-id");
    if (!id) return;

    var modal = byId("cancel-reg-profile-modal");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");

      byId("profile-cancel-reg-confirm").onclick = function () {
        Storage.unregisterEvent(id);
        if (Storage.deleteRegistrationDetails) Storage.deleteRegistrationDetails(id);
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        renderAllLists();
        Utils.showToast("Registration cancelled.", "info");
      };

      byId("profile-cancel-reg-dismiss").onclick = function () {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
      };
    }
  });

  byId("saved-blogs-grid").addEventListener("click", function (event) {
    var btn = event.target.closest(".js-unsave-blog");
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    var id = btn.getAttribute("data-id");
    if (!id) return;

    Storage.unsaveBlog(id);
    renderAllLists();
    Utils.showToast("Blog removed from saved.", "info");
  });

  byId("my-blogs-grid").addEventListener("click", function (event) {
    var deleteBtn = event.target.closest(".js-delete-blog");
    if (deleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      openDeleteModal(deleteBtn.getAttribute("data-id"));
      return;
    }
  });

  var confirmBtn = byId("delete-blog-confirm-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      var blogId = state.pendingDeleteId;
      if (!blogId) return;

      Storage.deleteUserBlog(blogId);

      var user = Storage.getUser();
      if (user) {
        user.savedBlogs = (user.savedBlogs || []).filter(function (id) { return id !== blogId; });
        user.myBlogs = (user.myBlogs || []).filter(function (id) { return id !== blogId; });
        Storage.setUser(user);
      }

      Storage.deleteComments(blogId);
      closeDeleteModal();
      renderAllLists();
      Utils.showToast("Blog deleted.", "success");
    });
  }

  var cancelBtn = byId("delete-blog-cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeDeleteModal);
  }

  window.addEventListener("hashchange", handleSectionHash);
}

function init() {
  Auth.guardPage("user-profile");

  refreshUser();
  updateDisplayFromUser();
  setEditMode(false);

  Promise.all([
    Utils.fetchJson("data/campaigns.json"),
    Utils.fetchJson("data/blogs.json")
  ]).then(function (result) {
    state.campaigns = Array.isArray(result[0]) ? result[0] : [];
    state.blogs = Array.isArray(result[1]) ? result[1] : [];

    renderAllLists();
    switchSavedTab("events");
    bindEvents();
    handleSectionHash();
  }).catch(function (err) {
    console.error("Failed to load profile datasets:", err);
    renderAllLists();
    switchSavedTab("events");
    bindEvents();
    handleSectionHash();
  });
}

Utils.onReady(init);
