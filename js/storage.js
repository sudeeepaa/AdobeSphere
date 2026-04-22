"use strict";

function readData(key, fallback) {
  try {
    var val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("Could not save to localStorage:", e);
    var utils = window.Utils;
    if (utils && typeof utils.showToast === "function") {
      utils.showToast("Storage is full. Please delete some old content to free up space.", "error", 4000);
    }
    return false;
  }
}

var KEYS = {
  USERS: "ae_users",
  USER: "ae_user",
  SESSION: "ae_session",
  USER_BLOGS: "ae_user_blogs",
  CONTACT_SUBMISSIONS: "ae_contact_submissions",
  BLOG_CATEGORIES: "ae_blog_categories",
  REGISTERED_USER_REGISTRY: "ae_registered_user_registry",
  REGISTERED_USER_SESSION: "ae_registered_user_session"
};

function getCommentsKey(blogId) {
  return "ae_comments_" + String(blogId);
}

function getRegistrationKey(email, eventId) {
  var safeEmail = String(email || "").replace(/[^a-z0-9]/gi, "_");
  return "ae_reg_" + safeEmail + "_" + String(eventId);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureUserCollections(user) {
  if (!user || typeof user !== "object") return user;
  user.savedEvents = ensureArray(user.savedEvents);
  user.savedBlogs = ensureArray(user.savedBlogs);
  user.registeredEvents = ensureArray(user.registeredEvents);
  user.myBlogs = ensureArray(user.myBlogs);
  return user;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getUserIdentity(user) {
  if (!user || typeof user !== "object") return "";

  var email = String(user.email || "").trim().toLowerCase();
  if (email) return email;

  var createdAt = String(user.createdAt || "").trim();
  var name = String(user.name || "").trim().toLowerCase();
  if (name && createdAt) return name + "|" + createdAt;

  return "";
}

var api = {
  getUsers: function () {
    var rawUsers = readData(KEYS.USERS, []);
    var users = (Array.isArray(rawUsers) ? rawUsers : [])
      .filter(function (u) { return u && typeof u === "object" && !Array.isArray(u); })
      .map(function (u) { return ensureUserCollections(u); });

    if (!users.length) {
      var legacy = readData(KEYS.USER, null);
      if (legacy && legacy.email) {
        users = [ensureUserCollections(legacy)];
        writeData(KEYS.USERS, users);
      }
    }

    return users;
  },

  getUserByEmail: function (email) {
    var target = normalizeEmail(email);
    if (!target) return null;

    var users = this.getUsers();
    return users.find(function (u) {
      return normalizeEmail(u && u.email) === target;
    }) || null;
  },

  upsertUser: function (userObj) {
    if (!userObj || typeof userObj !== "object") return this.getUsers();

    var email = normalizeEmail(userObj.email);
    if (!email) return this.getUsers();

    var next = ensureUserCollections(Object.assign({}, userObj, { email: email }));
    var users = this.getUsers();
    var found = false;

    var updated = users.map(function (u) {
      if (normalizeEmail(u && u.email) === email) {
        found = true;
        return next;
      }
      return u;
    });

    if (!found) updated.push(next);

    writeData(KEYS.USERS, updated);
    return updated;
  },

  getUser: function () {
    var sessionVal = this.getSession();
    if (!sessionVal || sessionVal === "logged_in") {
      var legacy = readData(KEYS.USER, null);
      if (legacy && legacy.email) {
        this.setSession(legacy.email);
        return ensureUserCollections(legacy);
      }
      return null;
    }
    return this.getUserByEmail(sessionVal);
  },

  setUser: function (userObj) {
    var next = ensureUserCollections(userObj);
    this.upsertUser(next);
    localStorage.removeItem(KEYS.USER);
  },

  updateUser: function (partialObj) {
    var currentUser = this.getUser() || {};
    var updatedUser = Object.assign({}, currentUser, partialObj || {});
    this.setUser(updatedUser);
    return updatedUser;
  },

  getActiveUserIdentity: function () {
    return getUserIdentity(this.getUser());
  },

  getSession: function () {
    return localStorage.getItem(KEYS.SESSION);
  },

  setSession: function (email) {
    localStorage.setItem(KEYS.SESSION, email || "logged_in");
  },

  clearSession: function () {
    localStorage.removeItem(KEYS.SESSION);
    localStorage.removeItem(KEYS.REGISTERED_USER_SESSION);
    localStorage.removeItem(KEYS.USER);
  },

  isLoggedIn: function () {
    return !!this.getSession() && !!this.getUser();
  },

  getRegisteredUserRegistry: function() {
    var registry = readData(KEYS.REGISTERED_USER_REGISTRY, {});
    return (registry && typeof registry === "object" && !Array.isArray(registry)) ? registry : {};
  },

  getRegisteredUsersCount: function () {
    return Object.keys(this.getRegisteredUserRegistry()).length;
  },

  markActiveUserCounted: function () {
    if (!this.isLoggedIn()) return false;

    var user = this.getUser();
    var identity = getUserIdentity(user);
    if (!identity) return false;

    var sessionIdentity = localStorage.getItem(KEYS.REGISTERED_USER_SESSION) || "";
    if (sessionIdentity === identity) {
      return false;
    }

    var registry = this.getRegisteredUserRegistry();
    var wasAlreadyCounted = !!registry[identity];

    if (!wasAlreadyCounted) {
      registry[identity] = true;
      writeData(KEYS.REGISTERED_USER_REGISTRY, registry);
    }

    localStorage.setItem(KEYS.REGISTERED_USER_SESSION, identity);
    return !wasAlreadyCounted;
  },

  getUserBlogs: function () {
    return readData(KEYS.USER_BLOGS, []);
  },

  getUserBlogsByOwner: function (ownerIdentity) {
    var identity = String(ownerIdentity || "").trim().toLowerCase();
    if (!identity) return [];

    var user = this.getUser() || {};
    var legacyId = String(user.id || "").trim();
    var legacyName = String(user.name || "").trim().toLowerCase();

    return this.getUserBlogs().filter(function (blog) {
      if (!blog || !blog.id) return false;
      var blogOwner = String(blog.ownerIdentity || "").trim().toLowerCase();
      if (blogOwner) return blogOwner === identity;

      var author = blog.author || {};
      var authorId = String(author.id || "").trim();
      var authorName = String(author.name || "").trim().toLowerCase();

      if (legacyId && authorId && authorId === legacyId) return true;
      if (legacyName && authorName && authorName === legacyName) return true;
      return false;
    });
  },

  getUserCreators: function () {
    var users = this.getUsers();
    var blogs = this.getUserBlogs();

    return users.map(function (user) {
      var identity = getUserIdentity(user);
      var avatar = (user && (user.avatarSrc || user.avatar)) || "";
      var bio = (user && user.bio) || "";
      var socials = (user && user.socials) || {};

      var blogIds = blogs
        .filter(function (blog) {
          return blog && String(blog.ownerIdentity || "").trim().toLowerCase() === String(identity || "").trim().toLowerCase();
        })
        .map(function (blog) { return blog.id; });

      return {
        id: "user:" + identity,
        name: (user && user.name) || "Community Creator",
        designation: (user && user.designation) || "Community Member",
        avatar: avatar || "assets/images/profiles/default-user.jpg",
        bio: bio,
        fullBio: bio,
        socials: socials,
        blogIds: blogIds,
        eventIds: [],
        stats: {
          blogsPublished: blogIds.length,
          eventsHosted: 0,
          testimonialsGiven: 0
        },
        isUserCreator: true
      };
    }).filter(function (creator) {
      return creator && creator.id;
    });
  },

  getUserBlogById: function (blogId) {
    var id = String(blogId || "");
    if (!id) return null;

    var blogs = this.getUserBlogs();
    return blogs.find(function (blog) {
      return blog && blog.id != null && String(blog.id) === id;
    }) || null;
  },

  addUserBlog: function (blogObj) {
    var blogs = this.getUserBlogs();
    blogs.push(blogObj);
    writeData(KEYS.USER_BLOGS, blogs);
    return blogs;
  },

  updateUserBlog: function (blogObj) {
    if (!blogObj || !blogObj.id) return this.getUserBlogs();

    var blogs = this.getUserBlogs();
    var found = false;

    var nextId = String(blogObj.id);

    var updated = blogs.map(function (blog) {
      if (blog && blog.id != null && String(blog.id) === nextId) {
        found = true;
        return blogObj;
      }
      return blog;
    });

    if (!found) {
      updated.push(blogObj);
    }

    writeData(KEYS.USER_BLOGS, updated);
    return updated;
  },

  deleteUserBlog: function (blogId) {
    var targetId = String(blogId || "");
    var blogs = this.getUserBlogs().filter(function (blog) {
      return blog && blog.id != null && String(blog.id) !== targetId;
    });
    writeData(KEYS.USER_BLOGS, blogs);
    return blogs;
  },

  getComments: function (blogId) {
    return readData(getCommentsKey(blogId), []);
  },

  saveRegistrationDetails: function (eventId, details) {
    var user = this.getUser();
    if (!user || !user.email) return false;
    var key = getRegistrationKey(user.email, eventId);
    return writeData(key, details);
  },

  getRegistrationDetails: function (eventId) {
    var user = this.getUser();
    if (!user || !user.email) return null;
    var key = getRegistrationKey(user.email, eventId);
    return readData(key, null);
  },

  deleteRegistrationDetails: function (eventId) {
    var user = this.getUser();
    if (!user || !user.email) return;
    var key = getRegistrationKey(user.email, eventId);
    localStorage.removeItem(key);
  },

  deleteComments: function (blogId) {
    localStorage.removeItem(getCommentsKey(blogId));
  },

  addComment: function (blogId, commentObj) {
    var key = getCommentsKey(blogId);
    var comments = readData(key, []);
    comments.unshift(commentObj);
    writeData(key, comments);
    return comments;
  },

  getContactSubmissions: function () {
    return readData(KEYS.CONTACT_SUBMISSIONS, []);
  },

  addContactSubmission: function (obj) {
    var submissions = this.getContactSubmissions();
    submissions.push(obj);
    writeData(KEYS.CONTACT_SUBMISSIONS, submissions);
    return submissions;
  },

  getBlogCategories: function () {
    return readData(KEYS.BLOG_CATEGORIES, []);
  },

  addBlogCategory: function (categoryName) {
    var name = String(categoryName || "").trim();
    if (!name) return this.getBlogCategories();

    var list = this.getBlogCategories();
    var lower = name.toLowerCase();
    var exists = list.some(function (c) {
      return String(c || "").trim().toLowerCase() === lower;
    });

    if (!exists) {
      list.push(name);
      writeData(KEYS.BLOG_CATEGORIES, list);
    }

    return list;
  },




  saveEvent: function (eventId) {
    var user = this.getUser();
    if (!user) return false;
    if (!user.savedEvents.includes(eventId)) {
      user.savedEvents.push(eventId);
      this.setUser(user);
    }
    return true;
  },

  unsaveEvent: function (eventId) {
    var user = this.getUser();
    if (!user) return false;
    user.savedEvents = user.savedEvents.filter(function (id) {
      return id !== eventId;
    });
    this.setUser(user);
    return true;
  },

  isEventSaved: function (eventId) {
    var user = this.getUser();
    return !!(user && user.savedEvents.includes(eventId));
  },

  saveBlog: function (blogId) {
    var user = this.getUser();
    if (!user) return false;
    if (!user.savedBlogs.includes(blogId)) {
      user.savedBlogs.push(blogId);
      this.setUser(user);
    }
    return true;
  },

  unsaveBlog: function (blogId) {
    var user = this.getUser();
    if (!user) return false;
    user.savedBlogs = user.savedBlogs.filter(function (id) {
      return id !== blogId;
    });
    this.setUser(user);
    return true;
  },

  isBlogSaved: function (blogId) {
    var user = this.getUser();
    return !!(user && user.savedBlogs.includes(blogId));
  },

  registerEvent: function (eventId) {
    var user = this.getUser();
    if (!user) return false;
    if (!user.registeredEvents.includes(eventId)) {
      user.registeredEvents.push(eventId);
      this.setUser(user);
    }
    return true;
  },

  unregisterEvent: function (eventId) {
    var user = this.getUser();
    if (!user) return false;
    user.registeredEvents = ensureArray(user.registeredEvents).filter(function (id) {
      return id !== eventId;
    });
    this.setUser(user);
    return true;
  },

  isEventRegistered: function (eventId) {
    var user = this.getUser();
    return !!(user && user.registeredEvents.includes(eventId));
  }
};

window.Storage = api;
