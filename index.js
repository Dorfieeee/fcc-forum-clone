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
const categoryBtns = document.getElementById("filter-btns");
const title = document.querySelector("main > h1");

const [DEFAULT, ASC, DESC] = [0, 1, 2];
const app = {
  topics: [],
  users: [],
  categories: new Map(),
  filters: {
    category: DEFAULT,
    order: {
      by: DEFAULT,
      in: DEFAULT,
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
      displayPostList();
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
function displayPostList() {
  app.topics.forEach(displayPost);

  function displayPost(post) {
    const category = supportedTopicCategories[post["category_id"]];
    const posters = post.posters.map(({ user_id: userId }) => userId);

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
      if (post["has_summary"]) {
        summary = `
          <p class='post-summary'>
            ${post.excerpt}
            <a class='post-read-more' href='${FORUM_TOPIC}/${post.slug}' target='_blank'>read more</a>
          </p>
          `;
      }
      return summary;
    };

    let postRow = `
      <tr> 
        <td class="post-topic">
          <span>
            <a class='post-title'
               href='${FORUM_TOPIC}/${post.slug}'
               target='_blank'>
              ${post.title}
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
        <td class="post-replies">${post.posts_count - 1}</td>
        <td class="post-views">${formatLargeNumber(post.views)}</td>
        <td class="post-activity">${formatDateDiff(
          Date.now(),
          post.bumped_at
        )}</td>
      </tr>`;
    postsContainer.innerHTML += postRow;
  }
}

function displayCategories() {
  // create the buttons
  app.categories.forEach((value, key) => {
    categoryBtns.innerHTML += `
    <button
         name="filter-button" 
         value=${key}
         class=${supportedTopicCategories[key].name}
         >
         ${supportedTopicCategories[key].longName} (${value})
    </button>`;
  });
}

function displayFooter() {
  document.getElementById("footer").style.display = "block";
  document.getElementById("copyright").innerText = new Date().getFullYear();
}

function activateSortBtns() {
  sortBtns.forEach((btn) => btn.addEventListener("click", handleSortBtnClick));

  function handleSortBtnClick(e) {
    console.log(e.target.value);
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
  app.topics = data.topic_list.topics.filter(
    (post) => post["category_id"] in supportedTopicCategories
  );

  app.users = data.users;

  app.topics.forEach((topic) => {
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

function handleFilterClick(event) {
  // when users clicks on the same filter button again
  // the filter is therefore cancelled
}
