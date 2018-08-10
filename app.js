const socket = io('http://localhost:3030');
const app = feathers();

app.configure(feathers.socketio(socket));

const articlesService = app.service('articles');
const categoriesService = app.service('categories');

const vm = new Vue({
  el: '#root',
  data: {
    articles: [],
    articlesLoading: true,
    categories: [],
    categoriesLoading: true,
    categoryAll: {
      name: 'All',
      shortname: ''
    },
    hideRead: false,
    selectedCategory: '',
    showCategoriesDrawer: false
  },
  computed: {
    showHideCategories: function () {
      return this.showCategoriesDrawer ? 'Hide categories' : 'Show categories';
    }
  },
  methods: {
    getArticles (category = {}) {
      const eventsCategory = this.categories.filter(c => c.shortname === 'events').pop();

      const query = {
        $limit: 50,
        $sort: {
          datetime: -1,
          createdAt: -1
        }
      };

      if (!category.shortname || !category._id) {
        query.categories = {
          $ne: eventsCategory._id
        };
      } else {
        query.categories = category._id;

        if (category.shortname === 'events') {
          query.datetime = {
            $gt: moment().startOf('day').valueOf()
          };
          query.$sort = {
            datetime: 1,
            createdAt: 1
          };
        }
      }

      this.articlesLoading = true;

      return articlesService.find({
        query
      })
        .then((result) => {
          this.articlesLoading = false;

          return result.data;
        })
        .catch((err) => {
          console.warn('Error while fetching articles:', err);
        });
    },
    getCategories () {
      this.categoriesLoading = true;

      return categoriesService.find()
        .catch((err) => {
          console.warn('Error while fetching categories:', err);
        })
        .then((categories) => {
          this.categoriesLoading = false;

          return [this.categoryAll, ...categories];
        })
        .catch((err) => {
          console.warn('Error while fetching categories:', err);
        });
    },
    selectCategory (shortname) {
      const category = this.categories.filter(c => c.shortname === shortname).pop();

      this.getArticles(category)
        .then((articles) => {
          this.articles = articles;
          this.selectedCategory = category.shortname ? category.shortname : '';
        });
    },
    toggleCategoriesDrawer () {
      this.showCategoriesDrawer = !this.showCategoriesDrawer;
    }
  },
  created () {
    window.setTimeout(() => {
      // articlesService.on('created', article => console.log('New article created', article));

      this.getCategories()
        .then((categories) => {
          this.categories = categories;

          this.getArticles()
            .then((articles) => {
              this.articles = articles;
            });
        });
    }, 500);
  }
});

Vue.component('blog-post', {
  props: [
    'article',
    'hideRead',
    'selectedCategory'
  ],
  data: function () {
    return {
      read: false
    };
  },
  computed: {
    displayTitle: function () {
      const { title } = this.article;

      return title.text ? title.text : title;
    },
    displayTime: function () {
      const fieldForTime = this.article.datetime ? this.article.datetime : this.article.createdAt;
      return moment(fieldForTime).format('YYYY-MM-DD HH-mm-ss');
    },
    show: function () {
      if (this.hideRead && this.read) {
        return false;
      }

      const articleCategories = this.article.categories || [];
      const isEvent = articleCategories.filter(c => c.shortname === 'events').length > 0;

      if (isEvent && this.selectedCategory !== 'events') {
        return false;
      }

      if (this.selectedCategory &&
          !articleCategories.filter(c => c.shortname === this.selectedCategory).length) {
        return false;
      }

      return true;
    }
  },
  template: `
    <div class="article" v-show="show">
      <div class="article-header">
        <h3 class="article-title">
          {{ displayTitle }}
          <a class="article-link" target="_blank" :href="article.link"><i class="fas fa-external-link-alt"></i></a>
        </h3>
        <h4 class="article-datetime">{{ displayTime }}</h4>
      </div>
      <div class="article-actions">
        <label><input type="checkbox" v-model="read"> Mark as read</label>
      </div>
    </div>
  `
});

Vue.component('category-item', {
  props: [
    'category',
    'selectedCategory'
  ],
  data: function () {
    return {
      classObject: {
        selected: this.category.shortname === this.selectedCategory
      }
    };
  },
  template: `
    <li class="classObject" @click="$emit('select-category', category.shortname)">
      {{ category.name }}
    </li>
  `
});
