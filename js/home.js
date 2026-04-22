"use strict";

var Utils = window.Utils;
var Router = window.Router;
var byId = Utils.byId;

function fallbackMessage(targetId, message) {
  var el = byId(targetId);
  if (!el) return;
  el.innerHTML = '<p class="empty-state">' + message + '</p>';
}

function renderFeaturedEvents(campaigns) {
  var grid = byId("featured-events-grid");
  if (!grid) return;

  var featured = campaigns
    .filter(function (item) { return item && item.featured === true; })
    .slice(0, 6);

  if (!featured.length) {
    fallbackMessage("featured-events-grid", "No featured events available right now.");
    return;
  }

  grid.innerHTML = featured.map(function (eventItem) {
    return Utils.buildEventCard(eventItem);
  }).join("");
}

function renderFeaturedBlogs(blogs) {
  var grid = byId("featured-blogs-grid");
  if (!grid) return;

  var featured = blogs
    .filter(function (item) { return item && item.featured === true; })
    .slice(0, 4);

  if (!featured.length) {
    fallbackMessage("featured-blogs-grid", "No featured articles available right now.");
    return;
  }

  grid.innerHTML = featured.map(function (blog) {
    return Utils.buildBlogCard(blog);
  }).join("");
}

function renderFeaturedCreators(creators) {
  var grid = byId("featured-creators-grid");
  if (!grid) return;

  var featured = creators.filter(function (item) {
    return item && item.featured === true;
  });

  if (!featured.length) {
    fallbackMessage("featured-creators-grid", "No featured creators available yet.");
    return;
  }

  grid.innerHTML = featured.map(function (creator) {
    return Utils.buildCreatorCard(creator);
  }).join("");
}

function setupCategoryMarquee() {
  var marquee = document.querySelector(".category-marquee__track");
  var pillsRow = document.querySelector(".category-marquee__track .category-pills");
  if (!marquee || !pillsRow) return;

  var reduceMotion = false;
  if (window.matchMedia) {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  if (!reduceMotion) {
    var clone = pillsRow.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll(".category-pill").forEach(function (btn) {
      btn.setAttribute("tabindex", "-1");
    });
    marquee.appendChild(clone);
  }
}

function setupCategoryPills() {
  var container = document.querySelector(".category-marquee") || document;

  var mapping = {
    "AI & Technology": { tab: "blogs", category: "AI & Emerging Technology" },
    "Creative Tools": { tab: "blogs", category: "Creative Tools & Product Updates" },
    "Industry Trends": { tab: "blogs", category: "Industry Trends & Thought Leadership" },
    "Community & Events": { tab: "blogs", category: "Community / Events / Creator Programs" },
    "Workshops": { tab: "events", category: "Workshops" },
    "Webinars": { tab: "events", category: "Webinars" },
    "Conferences": { tab: "events", category: "Conferences" }
  };

  container.addEventListener("click", function (event) {
    var pill = event.target && event.target.closest ? event.target.closest(".category-pill") : null;
    if (!pill) return;

    var categoryKey = pill.getAttribute("data-category") || "All";
    if (categoryKey === "All") {
      Router.navigate(Utils.appPath("pages/explore.html"));
      return;
    }

    var config = mapping[categoryKey] || { tab: "events", category: categoryKey };
    var target = "pages/explore.html?tab=" + encodeURIComponent(config.tab);
    if (config.category) {
      target += "&category=" + encodeURIComponent(config.category);
    }

    Router.navigate(Utils.appPath(target));
  });
}

function setupHomeSearch() {
  var input = byId("home-search");
  var searchBtn = byId("home-search-btn");
  var typeChips = document.querySelectorAll(".search-chip");
  var categorySelect = byId("home-category");
  if (!input) return;

  var activeType = "all";

  function runSearch() {
    var query = input.value.trim();
    var target = "pages/explore.html";
    var params = [];

    if (query) {
      params.push("q=" + encodeURIComponent(query));
    }

    if (activeType && activeType !== "all") {
      params.push("type=" + encodeURIComponent(activeType));
    }

    if (categorySelect && categorySelect.value) {
      params.push("category=" + encodeURIComponent(categorySelect.value));
    }

    if (params.length) {
      target += "?" + params.join("&");
    }

    Router.navigate(Utils.appPath(target));
  }

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      runSearch();
    }
  });

  if (searchBtn) {
    searchBtn.addEventListener("click", runSearch);
  }

  typeChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      typeChips.forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      activeType = chip.getAttribute("data-type") || "all";
    });
  });
}

function init() {
  if (Storage && Storage.isLoggedIn && Storage.isLoggedIn()) {
    var joinBtn = byId("join-community-btn");
    if (joinBtn) joinBtn.style.display = "none";
  }

  Promise.all([
    Utils.fetchJson("data/campaigns.json"),
    Utils.fetchJson("data/blogs.json"),
    Utils.fetchJson("data/creators.json")
  ]).then(function (result) {
    renderFeaturedEvents(Array.isArray(result[0]) ? result[0] : []);
    renderFeaturedBlogs(Array.isArray(result[1]) ? result[1] : []);
    renderFeaturedCreators(Array.isArray(result[2]) ? result[2] : []);
    Utils.initRevealObserver();
  }).catch(function (error) {
    console.error("Failed to load home page data:", error);
    fallbackMessage("featured-events-grid", "Unable to load featured events right now.");
    fallbackMessage("featured-blogs-grid", "Unable to load featured blogs right now.");
    fallbackMessage("featured-creators-grid", "Unable to load featured creators right now.");
    Utils.initRevealObserver();
  });

  setupCategoryMarquee();
  setupCategoryPills();
  setupHomeSearch();
}

Utils.onReady(init);
