import {
  FORUM_TOPIC,
  FORUM_CATEGORY,
  FORUM_AVATARS,
  FORUM_API,
  FORUM_USER,
} from "./constants.js";

import {
  supportedTopicCategories,
  formatDateDiff,
  formatLargeNumber,
} from "./helpers.js";

// GLOBALS
const postsContainer = document.getElementById("posts-container");
const sortBtns = document.getElementsByName("sort");
const categoryBtns = document.getElementsByName("filter-button");
const categoryBtnsContainer = document.getElementById("filter-btns");
const title = document.querySelector("main > h1");

const SORT_BY_DEFAULT = "bumped_at";
const SORT_DIR_ASC = 1;
const SORT_DIR_DESC = 2;
const DEFAULT = null;

// APP STATE
const app = {
  topics: [],
  users: [],
  displayedTopics: [],
  categories: new Map(),
  filters: {
    category: DEFAULT,
    order: {
      by: SORT_BY_DEFAULT,
      dir: SORT_DIR_ASC,
    },
  },
  isLoading: true,
  isError: false,
};

// MAIN
document.addEventListener("DOMContentLoaded", () => {
  // DOMContentLoaded event fires when the HTML document has been completely parsed

  setLoadingState();
  // Fetch FCC forum latest data
  fetch(FORUM_API)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      parseForumData(data);
      displayTopics();
      displayCategories();
      displayFooter();
      activateSortBtns();
    })
    .catch((error) => {
      app.isError = true;
      console.log(error);
    })
    .finally(() => {
      app.isLoading = false;
    });
});

// AUXILIARY FUNCTIONS
function displayTopics(prevFilters = null) {
  // filter and sort topics
  let nextDisplayedTopics = [...app.displayedTopics];

  // FILTER
  if (app.filters.category === DEFAULT) {
    // default view
    nextDisplayedTopics = [...app.topics];
  } else if (prevFilters && prevFilters.category !== app.filters.category) {
    // when category filter has been changed
    nextDisplayedTopics = [...app.topics].filter(
      (topic) => topic.category_id === app.filters.category
    );
  }

  // SORT
  if (app.filters.order.dir === SORT_DIR_ASC) {
    nextDisplayedTopics.sort((a, b) => compareTopics(a, b));
  } else if (app.filters.order.dir === SORT_DIR_DESC) {
    nextDisplayedTopics.sort((a, b) => compareTopics(b, a));
  }

  // REMOVE
  while (postsContainer.firstChild) {
    postsContainer.firstChild.remove();
  }

  // POPULATE
  app.displayedTopics = nextDisplayedTopics;
  app.displayedTopics.map(getTopicElement).forEach(displayTopic);

  function compareTopics(topicA, topicB) {
    let prop = app.filters.order.by;
    let a, b;
    switch (prop) {
      case "posts_count":
        a = topicA[prop] - 1;
        b = topicB[prop] - 1;
        break;
      case "bumped_at":
        // swap a with b as we want to sort by activity
        // from the newest to the oldest
        a = new Date(topicB[prop]);
        b = new Date(topicA[prop]);
        break;
      default:
        a = topicA[prop];
        b = topicB[prop];
        break;
    }
    return a - b;
  }

  function displayTopic(el) {
    postsContainer.append(el);
  }

  function getTopicElement(topic) {
    const category = supportedTopicCategories[topic["category_id"]];
    const posters = topic.posters.map(({ user_id: userId }) => userId);

    let postersAvatars = "";
    const displayPosterAvatar = (posterId) => {
      const poster = app.users.find((user) => user.id == posterId);
      const avatarTemplate = poster["avatar_template"].replace("{size}", "25");
      const posterAvatar = avatarTemplate.startsWith("/")
        ? `${FORUM_AVATARS}/${avatarTemplate}`
        : avatarTemplate;
      postersAvatars += `
          <a href="${FORUM_USER}/${poster.username}" target="_blank">
            <img src="${posterAvatar}" title="${poster.username}" alt="Open ${poster.username}'s profile" width="25" height="25" />
          </a>
        `;
    };
    posters.forEach(displayPosterAvatar);

    const ifSummaryDisplay = () => {
      let summary = "";
      if (topic["has_summary"]) {
        summary = `
          <p class='post-summary'>
            ${topic.excerpt}
            <a class='post-read-more' href='${FORUM_TOPIC}/${topic.slug}' target='_blank'>read more</a>
          </p>
          `;
      }
      return summary;
    };

    let postRow = document.createElement("tr");
    postRow.innerHTML = `
      <td class="post-topic">
        <span>
          <a class='post-title'
              href='${FORUM_TOPIC}/${topic.slug}'
              target='_blank'>
            ${topic.title}
          </a>
        </span>
        <div class='post-category'>
          <a 
            class='${category.name}'
            href='${FORUM_CATEGORY}/${category.name}'
            target='_blank'>
            ${category.longName}
          </a>
        </div>
        ${ifSummaryDisplay()}
      </td>
      <td class="post-posters">
        <div class="postersAvatars">${postersAvatars}</div>
      </td>
      <td class="post-replies">${topic.posts_count - 1}</td>
      <td class="post-views">${formatLargeNumber(topic.views)}</td>
      <td class="post-activity">${formatDateDiff(
        Date.now(),
        topic.bumped_at
      )}</td>`;

    return postRow;
  }
}

function displayCategories() {
  // create the buttons
  app.categories.forEach((value, key) => {
    const btn = document.createElement("button");
    btn.name = "filter-button";
    btn.value = `${key}`;
    btn.className = `${supportedTopicCategories[key].name}`;
    btn.textContent = `${supportedTopicCategories[key].longName} (${value})`;
    btn.onclick = handleCategoryFilterClick;
    // append to its parent node
    categoryBtnsContainer.append(btn);
  });
}

function displayFooter() {
  document.getElementById("footer").style.display = "block";
  document.getElementById("copyright").innerText = new Date().getFullYear();
}

function activateSortBtns() {
  sortBtns.forEach((btn) => btn.addEventListener("click", handleSortBtnClick));

  function handleSortBtnClick(event) {
    const btnEl = event.currentTarget;
    const selectedCriterion = btnEl.value;
    let isReset = false;
    // when the user clicks on the same button
    if (app.filters.order.by === selectedCriterion) {
      app.filters.order.dir += 1;
      // when the user clicks on a different button
    } else {
      app.filters.order.by = selectedCriterion;
      app.filters.order.dir = SORT_DIR_ASC;
    }
    // when the user has click on the same button for the 3rd time
    if (app.filters.order.dir % 3 === 0) {
      isReset = true;
      app.filters.order.by = SORT_BY_DEFAULT;
      app.filters.order.dir = SORT_DIR_ASC;
    }

    // change active button style
    setActiveBtnStyle();
    // re-render the table with recently changed filter settings
    displayTopics();

    function setActiveBtnStyle() {
      sortBtns.forEach((btn) => btn.classList.remove("active"));
      if (!isReset) {
        btnEl.classList.toggle("active");
      }
    }
  }
}

function setLoadingState() {
  // let's make sure this code does not execute
  // when the state is not set to isLoading = true
  if (!app.isLoading) return;

  let titleText = "Loading";
  let titleUpdateInterval = null;
  let dots = [];

  title.innerHTML = titleText;
  titleUpdateInterval = setInterval(updateTitle, 150);

  function updateTitle() {
    if (!app.isLoading || app.isError) {
      // display appropriate title
      if (app.isError) {
        title.innerHTML = "Something went wrong :(";
      } else {
        title.innerHTML = "Latest topics";
      }

      // stop the title from changing to "Loading...""
      clearInterval(titleUpdateInterval);
      return;
    }

    if (dots.length < 3) {
      dots.push(".");
    } else {
      dots = [];
    }

    title.innerHTML = titleText + dots.join("");
  }
}

function parseForumData(data) {
  let topics = data.topic_list.topics.filter(
    (topic) => topic["category_id"] in supportedTopicCategories
  );

  app.users = data.users;
  app.topics = topics;

  topics.forEach((topic) => {
    if (app.categories.has(topic.category_id)) {
      app.categories.set(
        topic.category_id,
        app.categories.get(topic.category_id) + 1
      );
      // make sure it only adds those categories we support
    } else if (topic.category_id in supportedTopicCategories) {
      app.categories.set(topic.category_id, 1);
    }
  });
}

function handleCategoryFilterClick(event) {
  const btnEl = event.currentTarget;
  const selectedCategory = Number(btnEl.value);
  const prevFilters = { ...app.filters };
  // when users clicks on the same filter button again
  // the filter is therefore cancelled
  if (selectedCategory === app.filters.category) {
    app.filters.category = DEFAULT;
  } else {
    app.filters.category = selectedCategory;
  }

  setActiveBtnStyle();
  // re-render the table with recently changed filter settings
  displayTopics(prevFilters);

  function setActiveBtnStyle() {
    categoryBtns.forEach((btn) => btn.classList.remove("active"));
    if (app.filters.category !== DEFAULT) {
      btnEl.classList.toggle("active");
    }
  }
}
