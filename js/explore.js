"use strict";

var Utils = window.Utils;
var Storage = window.Storage;
var Router = window.Router;
var byId = Utils.byId;

var state = {
  activeTab: "events",
  searchQuery: "",
  eventsPage: 1,
  blogsPage: 1,
  creatorsPage: 1,
  pageSize: 9,
  data: {
    events: [],
    blogs: [],
    creators: []
  }
};

function makeEmptyState(message) {
  return ''
    + '<div class="empty-state">'
    + '  <div class="empty-state__icon" aria-hidden="true">'
    + '    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '      <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>'
    + '      <path d="M20 20L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>'
    + '    </svg>'
    + '  </div>'
      + '  <p class="empty-state__message">' + Utils.escapeHtml(message) + '</p>'
    + '</div>';
}

function mergeUserBlogs(baseBlogs) {
  var userBlogs = [];
  userBlogs = (Storage && typeof Storage.getUserBlogs === "function") ? (Storage.getUserBlogs() || []) : [];

  var seen = {};
  var merged = [];

  baseBlogs.concat(userBlogs).forEach(function (blog) {
    if (!blog || !blog.id || seen[blog.id]) return;
    seen[blog.id] = true;
    merged.push(blog);
  });

  return merged;
}

function populateBlogCategorySelect() {
  var el = byId("blogs-category");
  if (!el) return;

  var current = String(el.value || "").trim();
  var categories = [];
  var seen = {};

  function pushCategory(value) {
    var v = String(value || "").trim();
    if (!v) return;
    var key = v.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    categories.push(v);
  }

  (state.data.blogs || []).forEach(function (b) {
    pushCategory(b && b.category);
  });

  if (Storage && typeof Storage.getBlogCategories === "function") {
    (Storage.getBlogCategories() || []).forEach(pushCategory);
  }

  if (current) pushCategory(current);

  categories.sort(function (a, b) {
    return String(a).localeCompare(String(b));
  });

  var html = '<option value="">All Categories</option>';
  categories.forEach(function (c) {
    html += '<option value="' + Utils.escapeHtml(c) + '">' + Utils.escapeHtml(c) + '</option>';
  });

  el.innerHTML = html;
  if (current) el.value = current;
}

function parseUrlState() {
  var tab = Router.getParam("tab");
  var type = Router.getParam("type");
  var q = Router.getParam("q");
  var category = Router.getParam("category");

  if (tab && ["events", "blogs", "creators"].indexOf(tab) !== -1) {
    state.activeTab = tab;
  }

  if (type && ["events", "blogs", "creators"].indexOf(type) !== -1) {
    state.activeTab = type;
  }

  if (q) {
    state.searchQuery = q;
    byId("explore-search").value = q;
  }

  if (category) {
    var eventsCategory = byId("events-category");
    var blogsCategory = byId("blogs-category");
    if (eventsCategory) eventsCategory.value = category;
    if (blogsCategory) blogsCategory.value = category;
  }
}

function applyTabState() {
  var tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(function (tabBtn) {
    var active = tabBtn.getAttribute("data-tab") === state.activeTab;
    tabBtn.classList.toggle("active", active);
    tabBtn.setAttribute("aria-selected", active ? "true" : "false");
  });

  var eventsGrid = byId("events-grid");
  var blogsGrid = byId("blogs-grid");
  var creatorsGrid = byId("creators-grid");

  var eventsPager = byId("events-pagination");
  var blogsPager = byId("blogs-pagination");
  var creatorsPager = byId("creators-pagination");

  var eventsFilters = document.querySelector('[data-filter-group="events"]');
  var blogsFilters = document.querySelector('[data-filter-group="blogs"]');
  var creatorsFilters = document.querySelector('[data-filter-group="creators"]');

  function toggleHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle("is-hidden", hidden);
  }

  toggleHidden(eventsGrid, state.activeTab !== "events");
  toggleHidden(blogsGrid, state.activeTab !== "blogs");
  toggleHidden(creatorsGrid, state.activeTab !== "creators");

  toggleHidden(eventsPager, state.activeTab !== "events");
  toggleHidden(blogsPager, state.activeTab !== "blogs");
  toggleHidden(creatorsPager, state.activeTab !== "creators");

  toggleHidden(eventsFilters, state.activeTab !== "events");
  toggleHidden(blogsFilters, state.activeTab !== "blogs");
  toggleHidden(creatorsFilters, state.activeTab !== "creators");
}

function clampPage(page, totalPages) {
  var p = Number(page) || 1;
  if (p < 1) p = 1;
  if (p > totalPages) p = totalPages;
  return p;
}

function updatePagination(kind, page, totalPages, totalItems) {
  var wrap = byId(kind + "-pagination");
  var prevBtn = byId(kind + "-prev");
  var nextBtn = byId(kind + "-next");
  var info = byId(kind + "-page");

  if (info) {
    info.textContent = totalItems ? ("Page " + page + " of " + totalPages) : "";
  }

  var shouldShow = totalPages > 1;
  if (wrap) {
    wrap.style.display = shouldShow ? "flex" : "none";
  }

  if (prevBtn) {
    prevBtn.disabled = page <= 1;
    prevBtn.style.visibility = page <= 1 ? "hidden" : "visible";
  }
  if (nextBtn) {
    nextBtn.disabled = page >= totalPages;
    nextBtn.style.visibility = page >= totalPages ? "hidden" : "visible";
  }
}

function getEventLocationLabel(item) {
  if (!item) return "";
  var loc = item.location || {};
  var city = String(loc.city || "").trim();
  var region = String(loc.state || "").trim();
  var country = String(loc.country || "").trim();

  if (city && region) return city + ", " + region;
  if (city) return city;
  if (region && country) return region + ", " + country;
  return country;
}

function getSelectedEventLocations() {
  var nodes = document.querySelectorAll('input[name="events-location"]:checked');
  if (!nodes || !nodes.length) return [];

  var selected = Array.prototype.slice.call(nodes)
    .map(function (n) { return String((n && n.value) || "").trim(); })
    .filter(Boolean)
    .map(function (v) { return v.toLowerCase(); });

  var seen = {};
  return selected.filter(function (v) {
    if (seen[v]) return false;
    seen[v] = true;
    return true;
  });
}

function renderEventLocationCheckboxes() {
  var host = byId("events-location");
  if (!host) return;

  var selectedValues = getSelectedEventLocations();
  var selectedMap = selectedValues.reduce(function (acc, value) {
    acc[value] = true;
    return acc;
  }, {});

  var seen = {};
  var locations = [];

  (state.data.events || []).forEach(function (item) {
    var label = getEventLocationLabel(item);
    if (!label) return;
    if (seen[label]) return;
    seen[label] = true;
    locations.push(label);
  });

  locations.sort(function (a, b) {
    return String(a || "").localeCompare(String(b || ""));
  });

  var html = '';
  locations.forEach(function (label) {
    var escaped = Utils.escapeHtml(label);
    var lower = String(label || "").toLowerCase();
    html += '<label><input type="checkbox" name="events-location" value="' + escaped + '"' + (selectedMap[lower] ? " checked" : "") + '> ' + escaped + '</label>';
  });

  host.innerHTML = html;
}

function getSelectedCreatorDesignations() {
  var nodes = document.querySelectorAll('input[name="creators-designation"]:checked');
  if (!nodes || !nodes.length) return [];

  var selected = Array.prototype.slice.call(nodes)
    .map(function (n) { return String((n && n.value) || "").trim(); })
    .filter(Boolean)
    .map(function (v) { return v.toLowerCase(); });

  var seen = {};
  return selected.filter(function (v) {
    if (seen[v]) return false;
    seen[v] = true;
    return true;
  });
}

function renderCreatorDesignationCheckboxes() {
  var host = byId("creators-designation");
  if (!host) return;

  var selectedValues = getSelectedCreatorDesignations();
  var selectedMap = selectedValues.reduce(function (acc, value) {
    acc[value] = true;
    return acc;
  }, {});

  var seen = {};
  var designations = [];

  (state.data.creators || []).forEach(function (item) {
    var label = String((item && item.designation) || "").trim();
    if (!label) return;
    var key = label.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    designations.push(label);
  });

  designations.sort(function (a, b) {
    return String(a || "").localeCompare(String(b || ""));
  });

  var html = '';
  designations.forEach(function (label) {
    var escaped = Utils.escapeHtml(label);
    var lower = String(label || "").toLowerCase();
    html += '<label><input type="checkbox" name="creators-designation" value="' + escaped + '"' + (selectedMap[lower] ? " checked" : "") + '> ' + escaped + '</label>';
  });

  host.innerHTML = html;
}

function filterEvents() {
  var categoryEl = byId("events-category");
  var dateFilterEl = document.querySelector('input[name="events-date"]:checked');

  var category = ((categoryEl && categoryEl.value) || "").toLowerCase();
  var locations = getSelectedEventLocations();
  var dateFilter = dateFilterEl ? dateFilterEl.value : "all";
  var search = state.searchQuery.toLowerCase();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var locationMap = locations.reduce(function (acc, value) {
    acc[value] = true;
    return acc;
  }, {});

  return state.data.events.filter(function (item) {
    var itemDate = new Date(item.date);
    var itemCategory = String(item.category || "").toLowerCase();
    var itemLocationLabel = getEventLocationLabel(item);
    var itemLocation = [
      item.location && item.location.city,
      item.location && item.location.state,
      item.location && item.location.country
    ].filter(Boolean).join(" ").toLowerCase();

    var textBlob = [item.title, item.shortDescription, itemCategory, itemLocation].join(" ").toLowerCase();

    var categoryOk = !category || itemCategory === category;
    var locationOk = !locations.length || !!locationMap[String(itemLocationLabel || "").toLowerCase()];
    var searchOk = !search || textBlob.indexOf(search) !== -1;

    var dateOk = true;
    if (dateFilter === "upcoming") {
      dateOk = !Number.isNaN(itemDate.getTime()) && itemDate >= today;
    } else if (dateFilter === "past") {
      dateOk = !Number.isNaN(itemDate.getTime()) && itemDate < today;
    }

    return categoryOk && locationOk && searchOk && dateOk;
  });
}

function filterBlogs() {
  var category = (byId("blogs-category").value || "").toLowerCase();
  var authorQuery = (byId("blogs-author").value || "").toLowerCase();
  var sortBy = byId("blogs-sort").value;
  var search = state.searchQuery.toLowerCase();

  var filtered = state.data.blogs.filter(function (item) {
    var itemCategory = String(item.category || "").toLowerCase();
    var authorName = String(item.author && item.author.name || "").toLowerCase();
    var textBlob = [item.title, item.excerpt, itemCategory, authorName].join(" ").toLowerCase();

    var categoryOk = !category || itemCategory === category;
    var authorOk = !authorQuery || authorName.indexOf(authorQuery) !== -1;
    var searchOk = !search || textBlob.indexOf(search) !== -1;

    return categoryOk && authorOk && searchOk;
  });

  filtered.sort(function (a, b) {
    var da = new Date(a.publishedDate).getTime() || 0;
    var db = new Date(b.publishedDate).getTime() || 0;
    return sortBy === "oldest" ? da - db : db - da;
  });

  return filtered;
}

function filterCreators() {
  var sortBy = byId("creators-sort").value;
  var search = state.searchQuery.toLowerCase();
  var selected = getSelectedCreatorDesignations();
  var selectedMap = selected.reduce(function (acc, v) {
    acc[v] = true;
    return acc;
  }, {});

  var filtered = state.data.creators.filter(function (item) {
    var role = String(item.designation || "").toLowerCase();
    var textBlob = [item.name, item.bio, role].join(" ").toLowerCase();
    var designationOk = !selected.length || !!selectedMap[role];
    var searchOk = !search || textBlob.indexOf(search) !== -1;
    return designationOk && searchOk;
  });

  filtered.sort(function (a, b) {
    if (sortBy === "testimonials") {
      var ta = (a.stats && a.stats.testimonialsGiven) || 0;
      var tb = (b.stats && b.stats.testimonialsGiven) || 0;
      return tb - ta;
    }

    var cmp = String(a.name || "").localeCompare(String(b.name || ""));
    return sortBy === "name-desc" ? -cmp : cmp;
  });

  return filtered;
}

function applyGlobalSearchTabSwitch() {
  var query = String(state.searchQuery || "").trim();
  if (!query) return;

  var counts = {
    events: filterEvents().length,
    blogs: filterBlogs().length,
    creators: filterCreators().length
  };

  if (counts[state.activeTab] > 0) return;

  var order = ["creators", "blogs", "events"];
  var next = order.find(function (k) { return counts[k] > 0; });
  if (!next || next === state.activeTab) return;

  state.activeTab = next;
  applyTabState();
  Router.setParam("tab", state.activeTab);
}

function renderEvents() {
  var grid = byId("events-grid");
  var items = filterEvents();
  var totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.eventsPage = clampPage(state.eventsPage, totalPages);
  var start = (state.eventsPage - 1) * state.pageSize;
  var slice = items.slice(start, start + state.pageSize);

  if (!slice.length) {
    grid.innerHTML = makeEmptyState("No events match your current filters.");
  } else {
    grid.innerHTML = slice.map(function (eventItem) {
      return Utils.buildEventCard(eventItem);
    }).join("");
  }

  updatePagination("events", state.eventsPage, totalPages, items.length);
  Utils.initRevealObserver();
}

function renderBlogs() {
  var grid = byId("blogs-grid");
  var items = filterBlogs();
  var totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.blogsPage = clampPage(state.blogsPage, totalPages);
  var start = (state.blogsPage - 1) * state.pageSize;
  var slice = items.slice(start, start + state.pageSize);

  if (!slice.length) {
    grid.innerHTML = makeEmptyState("No blogs match your current filters.");
  } else {
    grid.innerHTML = slice.map(function (blog) {
      return Utils.buildBlogCard(blog);
    }).join("");
  }

  updatePagination("blogs", state.blogsPage, totalPages, items.length);
  Utils.initRevealObserver();
}

function renderCreators() {
  var grid = byId("creators-grid");
  var items = filterCreators();
  var totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.creatorsPage = clampPage(state.creatorsPage, totalPages);
  var start = (state.creatorsPage - 1) * state.pageSize;
  var slice = items.slice(start, start + state.pageSize);

  if (!slice.length) {
    grid.innerHTML = makeEmptyState("No creators match your current filters.");
  } else {
    grid.innerHTML = slice.map(function (creator) {
      return Utils.buildCreatorCard(creator);
    }).join("");
  }

  updatePagination("creators", state.creatorsPage, totalPages, items.length);
  Utils.initRevealObserver();
}

function rerenderAll() {
  renderEvents();
  renderBlogs();
  renderCreators();
}

function resetPaginationAndRender() {
  state.eventsPage = 1;
  state.blogsPage = 1;
  state.creatorsPage = 1;
  rerenderAll();
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      state.activeTab = button.getAttribute("data-tab");
      applyTabState();
      Router.setParam("tab", state.activeTab);
    });
  });
}

function setupSearch() {
  var input = byId("explore-search");
  var button = byId("explore-search-btn");

  function handleSearchInput() {
    state.searchQuery = input.value.trim();
    resetPaginationAndRender();
    applyGlobalSearchTabSwitch();
  }

  input.addEventListener("input", handleSearchInput);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      handleSearchInput();
    }
  });

  if (button) {
    button.addEventListener("click", handleSearchInput);
  }
}

function setupFilters() {
  var selectInputs = [
    byId("events-category"),
    byId("blogs-category"),
    byId("blogs-sort"),
    byId("creators-sort")
  ];

  var textInputs = [byId("blogs-author")];

  selectInputs.forEach(function (el) {
    if (!el) return;
    el.addEventListener("change", resetPaginationAndRender);
  });

  textInputs.forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", resetPaginationAndRender);
  });

  document.querySelectorAll('input[name="events-date"]').forEach(function (radio) {
    radio.addEventListener("change", resetPaginationAndRender);
  });

  var clearBtn = byId("clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
    byId("events-category").value = "";
    document.querySelectorAll('input[name="events-location"]').forEach(function (node) {
      node.checked = false;
    });
    byId("blogs-category").value = "";
    byId("blogs-author").value = "";
    byId("blogs-sort").value = "newest";
    byId("creators-sort").value = "name-asc";
    document.querySelectorAll('input[name="creators-designation"]').forEach(function (node) {
      node.checked = false;
    });
    byId("explore-search").value = "";
    state.searchQuery = "";
    var allDate = document.querySelector('input[name="events-date"][value="all"]');
    if (allDate) allDate.checked = true;
    resetPaginationAndRender();
    });
  }

  var locationHost = byId("events-location");
  if (locationHost && !locationHost.__aeChangeBound) {
    locationHost.__aeChangeBound = true;
    locationHost.addEventListener("change", resetPaginationAndRender);
  }

  var designationHost = byId("creators-designation");
  if (designationHost && !designationHost.__aeChangeBound) {
    designationHost.__aeChangeBound = true;
    designationHost.addEventListener("change", resetPaginationAndRender);
  }
}

function setupPagination() {
  var pairs = [
    { kind: "events", getPage: function () { return state.eventsPage; }, setPage: function (p) { state.eventsPage = p; }, render: renderEvents },
    { kind: "blogs", getPage: function () { return state.blogsPage; }, setPage: function (p) { state.blogsPage = p; }, render: renderBlogs },
    { kind: "creators", getPage: function () { return state.creatorsPage; }, setPage: function (p) { state.creatorsPage = p; }, render: renderCreators }
  ];

  pairs.forEach(function (cfg) {
    var prev = byId(cfg.kind + "-prev");
    var next = byId(cfg.kind + "-next");

    if (prev) {
      prev.addEventListener("click", function () {
        cfg.setPage(cfg.getPage() - 1);
        cfg.render();
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        cfg.setPage(cfg.getPage() + 1);
        cfg.render();
      });
    }
  });
}

function initData() {
  Promise.all([
    Utils.fetchJson("data/campaigns.json"),
    Utils.fetchJson("data/blogs.json"),
    Utils.fetchJson("data/creators.json")
  ]).then(function (data) {
    state.data.events = Array.isArray(data[0]) ? data[0] : [];
    state.data.blogs = mergeUserBlogs(Array.isArray(data[1]) ? data[1] : []);
    state.data.creators = Array.isArray(data[2]) ? data[2] : [];

    if (Storage && typeof Storage.getUserCreators === "function") {
      state.data.creators = state.data.creators.concat(Storage.getUserCreators() || []);
    }

    var seen = {};
    state.data.creators = state.data.creators.filter(function (c) {
      if (!c || !c.id) return false;
      if (seen[c.id]) return false;
      seen[c.id] = true;
      return true;
    });

    populateBlogCategorySelect();
    renderEventLocationCheckboxes();
    renderCreatorDesignationCheckboxes();
    resetPaginationAndRender();

    applyGlobalSearchTabSwitch();
  }).catch(function (err) {
    console.error("Failed to load explore data:", err);
    byId("events-grid").innerHTML = makeEmptyState("Unable to load events right now.");
    byId("blogs-grid").innerHTML = makeEmptyState("Unable to load blogs right now.");
    byId("creators-grid").innerHTML = makeEmptyState("Unable to load creators right now.");
    var eventsPagination = byId("events-pagination");
    var blogsPagination = byId("blogs-pagination");
    var creatorsPagination = byId("creators-pagination");
    if (eventsPagination) eventsPagination.style.display = "none";
    if (blogsPagination) blogsPagination.style.display = "none";
    if (creatorsPagination) creatorsPagination.style.display = "none";
  });
}

function init() {
  setupTabs();
  setupSearch();
  setupFilters();
  setupPagination();
  parseUrlState();
  applyTabState();
  initData();
}

Utils.onReady(init);
