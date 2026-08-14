import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from './config.js'

import {
  createClient
} from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_TELEGRAM_ID =
  1023844365

const BOT_USERNAME =
  'KamkaStore_Bot'

const CHANNEL_USERNAME =
  'kamkastore'


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )


// ======================================================
// TELEGRAM
// ======================================================

const tg =
  window.Telegram?.WebApp


if (tg) {
  tg.ready()
  tg.expand()

  try {
    tg.setHeaderColor('#ffffff')
    tg.setBackgroundColor('#ffffff')
  } catch (error) {
    console.log(
      'Telegram colors unavailable',
      error
    )
  }
}


const telegramUser =
  tg?.initDataUnsafe?.user ||
  null


const TELEGRAM_ID =
  Number(
    telegramUser?.id ||
    0
  )


const TELEGRAM_USERNAME =
  telegramUser?.username
    ? `@${telegramUser.username}`
    : ''


const TELEGRAM_NAME =
  [
    telegramUser?.first_name,
    telegramUser?.last_name
  ]
    .filter(Boolean)
    .join(' ')


const INIT_DATA =
  tg?.initData ||
  ''


const IS_ADMIN =
  TELEGRAM_ID ===
  ADMIN_TELEGRAM_ID


// ======================================================
// EDGE FUNCTIONS
// ======================================================

const FUNCTIONS_URL =
  `${SUPABASE_URL}/functions/v1`


const STORE_FEATURES_URL =
  `${FUNCTIONS_URL}/store-features`


const ADMIN_PRODUCT_URL =
  `${FUNCTIONS_URL}/admin-product`


const CHANNEL_POST_URL =
  `${FUNCTIONS_URL}/channel-post`


// ======================================================
// DOM HELPERS
// ======================================================

function $(
  selector
) {
  return document.querySelector(
    selector
  )
}


function $$(
  selector
) {
  return [
    ...document.querySelectorAll(
      selector
    )
  ]
}


function byId(
  id
) {
  return document.getElementById(
    id
  )
}


function escapeHtml(
  value
) {
  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    )
}


function formatPrice(
  value
) {
  const number =
    Number(value) || 0

  return `${number.toLocaleString(
    'ru-RU'
  )} ₽`
}


function formatDate(
  value
) {
  if (!value) {
    return ''
  }

  try {
    return new Date(
      value
    ).toLocaleString(
      'ru-RU',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    )
  } catch {
    return ''
  }
}


function normalizeUsername(
  value
) {
  let username =
    String(
      value || ''
    ).trim()

  if (!username) {
    return ''
  }

  if (
    username.startsWith(
      'https://t.me/'
    )
  ) {
    username =
      username
        .replace(
          'https://t.me/',
          ''
        )
        .split('?')[0]
  }

  username =
    username.replace(
      /^@+/,
      ''
    )

  return username
    ? `@${username}`
    : ''
}


function setStatus(
  element,
  text,
  type = ''
) {
  if (!element) {
    return
  }

  element.textContent =
    text || ''

  element.classList.remove(
    'status-success',
    'status-error'
  )

  if (
    type === 'success'
  ) {
    element.classList.add(
      'status-success'
    )
  }

  if (
    type === 'error'
  ) {
    element.classList.add(
      'status-error'
    )
  }
}


function sleep(
  ms
) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  )
}


// ======================================================
// APP STATE
// ======================================================

let products = []

let filteredProducts = []

let adminProducts = []

let adminOrders = []

let adminOrderMode =
  'active'

let adminProductMode =
  'active'

let currentProduct =
  null

let selectedVariant =
  null

let currentGalleryIndex =
  0

let favorites =
  new Set()

let cart = []

let subscribedBrands =
  new Set()

let appliedPromo =
  null

let checkoutSubtotal =
  0

let checkoutDiscount =
  0

let checkoutFinal =
  0

let currentSection =
  'home'

let referralData =
  null

let homeReviews =
  []

let productReviewsCache =
  new Map()


// ======================================================
// LOCAL STORAGE
// ======================================================

const CART_STORAGE_KEY =
  'kamka_cart_v4'

const FAVORITES_STORAGE_KEY =
  'kamka_favorites_v4'


function loadLocalCart() {
  try {
    const raw =
      localStorage.getItem(
        CART_STORAGE_KEY
      )

    const parsed =
      JSON.parse(
        raw || '[]'
      )

    cart =
      Array.isArray(parsed)
        ? parsed
        : []
  } catch {
    cart = []
  }
}


function saveLocalCart() {
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(cart)
  )
}


function loadLocalFavorites() {
  try {
    const raw =
      localStorage.getItem(
        FAVORITES_STORAGE_KEY
      )

    const parsed =
      JSON.parse(
        raw || '[]'
      )

    favorites =
      new Set(
        Array.isArray(parsed)
          ? parsed.map(Number)
          : []
      )
  } catch {
    favorites =
      new Set()
  }
}


function saveLocalFavorites() {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify(
      [...favorites]
    )
  )
}


// ======================================================
// API HELPERS
// ======================================================

async function callStoreFeatures(
  action,
  payload = {}
) {
  const response =
    await fetch(
      STORE_FEATURES_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        },

        body:
          JSON.stringify({
            action,

            init_data:
              INIT_DATA,

            ...payload
          })
      }
    )


  let result

  try {
    result =
      await response.json()
  } catch {
    throw new Error(
      'Сервер вернул некорректный ответ'
    )
  }


  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      'Ошибка сервера'
    )
  }


  if (
    result?.ok === false
  ) {
    throw new Error(
      result?.error ||
      'Не удалось выполнить запрос'
    )
  }


  return result
}


async function callAdminProduct(
  formData
) {
  if (
    !(formData instanceof FormData)
  ) {
    throw new Error(
      'Ожидался FormData'
    )
  }


  if (
    !formData.has(
      'init_data'
    )
  ) {
    formData.append(
      'init_data',
      INIT_DATA
    )
  }


  const response =
    await fetch(
      ADMIN_PRODUCT_URL,
      {
        method: 'POST',

        headers: {
          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        },

        body:
          formData
      }
    )


  let result

  try {
    result =
      await response.json()
  } catch {
    throw new Error(
      'Сервер вернул некорректный ответ'
    )
  }


  if (!response.ok) {
    throw new Error(
      result?.error ||
      'Ошибка admin-product'
    )
  }


  if (
    result?.ok === false
  ) {
    throw new Error(
      result?.error ||
      'Ошибка admin-product'
    )
  }


  return result
}


async function callChannelPost(
  text,
  withButton = true
) {
  const response =
    await fetch(
      CHANNEL_POST_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        },

        body:
          JSON.stringify({
            init_data:
              INIT_DATA,

            text,

            with_button:
              withButton
          })
      }
    )


  let result

  try {
    result =
      await response.json()
  } catch {
    throw new Error(
      'Сервер вернул некорректный ответ'
    )
  }


  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.telegram
        ?.description ||
      'Не удалось опубликовать пост'
    )
  }


  return result
}


// ======================================================
// PRODUCT NORMALIZATION
// ======================================================

function normalizeVariant(
  variant
) {
  if (
    typeof variant ===
    'string'
  ) {
    return {
      size: variant,
      stock: 1
    }
  }


  return {
    ...variant,

    size:
      String(
        variant?.size ||
        variant?.name ||
        ''
      ),

    stock:
      Number(
        variant?.stock ||
        0
      )
  }
}


function normalizeProduct(
  product
) {
  let images = []


  if (
    Array.isArray(
      product?.images
    )
  ) {
    images =
      product.images.filter(
        Boolean
      )
  }


  if (
    product?.image_url &&
    !images.includes(
      product.image_url
    )
  ) {
    images.unshift(
      product.image_url
    )
  }


  const variants =
    Array.isArray(
      product?.variants
    )
      ? product.variants.map(
          normalizeVariant
        )
      : []


  return {
    ...product,

    id:
      Number(
        product.id
      ),

    price:
      Number(
        product.price ||
        0
      ),

    images,

    variants,

    active:
      product.active !==
      false
  }
}


function productHasStock(
  product
) {
  const variants =
    product?.variants ||
    []

  if (!variants.length) {
    return true
  }

  return variants.some(
    variant =>
      Number(
        variant.stock
      ) > 0
  )
}


function getProductImage(
  product
) {
  return (
    product?.images?.[0] ||
    product?.image_url ||
    ''
  )
}


function getAvailableSizes(
  product
) {
  return (
    product?.variants ||
    []
  )
    .filter(
      variant =>
        Number(
          variant.stock
        ) > 0
    )
    .map(
      variant =>
        String(
          variant.size ||
          ''
        )
    )
    .filter(Boolean)
}


// ======================================================
// MAIN SECTIONS
// ======================================================

const sectionMap = {
  home:
    'homeSection',

  stock:
    'stockSection',

  poizon:
    'poizonSection',

  custom:
    'customOrderSection',

  cheaper:
    'cheaperSection',

  orders:
    'myOrdersSection',

  account:
    'accountSection',

  admin:
    'adminSection'
}


const sectionButtonMap = {
  home:
    'homeSectionBtn',

  stock:
    'stockSectionBtn',

  poizon:
    'poizonSectionBtn',

  custom:
    'customOrderSectionBtn',

  cheaper:
    'cheaperSectionBtn',

  orders:
    'myOrdersSectionBtn',

  account:
    'accountSectionBtn',

  admin:
    'adminSectionBtn'
}


function showSection(
  sectionName,
  options = {}
) {
  const {
    scroll = true
  } = options


  currentSection =
    sectionName


  Object.entries(
    sectionMap
  ).forEach(
    ([
      name,
      elementId
    ]) => {

      const element =
        byId(
          elementId
        )

      if (!element) {
        return
      }

      element.classList.toggle(
        'hidden',
        name !==
        sectionName
      )
    }
  )


  Object.entries(
    sectionButtonMap
  ).forEach(
    ([
      name,
      elementId
    ]) => {

      const button =
        byId(
          elementId
        )

      if (!button) {
        return
      }

      button.classList.toggle(
        'active',
        name ===
        sectionName
      )
    }
  )


  if (
    sectionName ===
    'stock'
  ) {
    renderProducts()
  }


  if (
    sectionName ===
    'orders'
  ) {
    loadMyOrders()
  }


  if (
    sectionName ===
    'account'
  ) {
    loadAccount()
  }


  if (
    sectionName ===
      'admin' &&
    IS_ADMIN
  ) {
    loadAdminDashboard()
  }


  if (scroll) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}


// ======================================================
// NAVIGATION EVENTS
// ======================================================

function setupNavigation() {

  byId(
    'homeSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'home'
      )
  )


  byId(
    'stockSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'stock'
      )
  )


  byId(
    'poizonSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'poizon'
      )
  )


  byId(
    'customOrderSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'custom'
      )
  )


  byId(
    'cheaperSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'cheaper'
      )
  )


  byId(
    'myOrdersSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'orders'
      )
  )


  byId(
    'accountSectionBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'account'
      )
  )


  byId(
    'adminSectionBtn'
  )?.addEventListener(
    'click',
    () => {

      if (!IS_ADMIN) {
        return
      }

      showSection(
        'admin'
      )
    }
  )


  byId(
    'homeOpenStockBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'stock'
      )
  )


  byId(
    'homeAllProductsBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'stock'
      )
  )


  byId(
    'homeCustomOrderBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'custom'
      )
  )


  byId(
    'homePoizonBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'poizon'
      )
  )


  byId(
    'homeCheaperBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'cheaper'
      )
  )


  byId(
    'homeReferralBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'account'
      )
  )
}


// ======================================================
// INITIAL TELEGRAM VALUES
// ======================================================

function fillTelegramFields() {

  const ids = [
    'stockTelegram',
    'poizonTelegram',
    'customOrderTelegram'
  ]


  ids.forEach(
    id => {

      const input =
        byId(id)

      if (
        input &&
        !input.value &&
        TELEGRAM_USERNAME
      ) {
        input.value =
          TELEGRAM_USERNAME
      }
    }
  )
}


// ======================================================
// LOAD PRODUCTS
// ======================================================

async function loadProducts() {

  const {
    data,
    error
  } =
    await supabase
      .from('products')
      .select(
        'id,brand,name,category,price,image_url,images,description,variants,active,created_at'
      )
      .eq(
        'active',
        true
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )


  if (error) {
    console.error(
      'Products error:',
      error
    )

    const grid =
      byId(
        'productGrid'
      )

    if (grid) {
      grid.innerHTML =
        `
          <div class="empty product-grid-empty">
            Не удалось загрузить товары
          </div>
        `
    }

    return
  }


  products =
    (data || [])
      .map(
        normalizeProduct
      )


  populateFilters()

  renderProducts()

  renderHomeNewProducts()

  renderHomeBrands()
}


// ======================================================
// FILTERS
// ======================================================

function populateFilters() {

  const brandFilter =
    byId(
      'brandFilter'
    )

  const sizeFilter =
    byId(
      'sizeFilter'
    )

  const categoryTabs =
    byId(
      'categoryTabs'
    )


  if (brandFilter) {

    const brands =
      [
        ...new Set(
          products
            .map(
              product =>
                product.brand
            )
            .filter(Boolean)
        )
      ]
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              'ru'
            )
        )


    brandFilter.innerHTML =
      `
        <option value="Все">
          Все бренды
        </option>

        ${brands
          .map(
            brand =>
              `
                <option value="${escapeHtml(
                  brand
                )}">
                  ${escapeHtml(
                    brand
                  )}
                </option>
              `
          )
          .join('')}
      `
  }


  if (sizeFilter) {

    const sizes =
      [
        ...new Set(
          products.flatMap(
            product =>
              getAvailableSizes(
                product
              )
          )
        )
      ]


    sizeFilter.innerHTML =
      `
        <option value="Все">
          Все размеры
        </option>

        ${sizes
          .map(
            size =>
              `
                <option value="${escapeHtml(
                  size
                )}">
                  ${escapeHtml(
                    size
                  )}
                </option>
              `
          )
          .join('')}
      `
  }


  if (categoryTabs) {

    const categories =
      [
        'Все',
        ...new Set(
          products
            .map(
              product =>
                product.category
            )
            .filter(Boolean)
        )
      ]


    categoryTabs.innerHTML =
      categories
        .map(
          (
            category,
            index
          ) =>
            `
              <button
                class="tab ${
                  index === 0
                    ? 'active'
                    : ''
                }"
                type="button"
                data-category="${escapeHtml(
                  category
                )}"
              >
                ${escapeHtml(
                  category
                )}
              </button>
            `
        )
        .join('')


    categoryTabs
      .querySelectorAll(
        '[data-category]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              categoryTabs
                .querySelectorAll(
                  '.tab'
                )
                .forEach(
                  item =>
                    item.classList.remove(
                      'active'
                    )
                )


              button.classList.add(
                'active'
              )


              renderProducts()
            }
          )
        }
      )
  }
}


function getSelectedCategory() {

  const active =
    byId(
      'categoryTabs'
    )
      ?.querySelector(
        '.tab.active'
      )


  return (
    active
      ?.dataset
      ?.category ||
    'Все'
  )
}


function getFilteredProducts() {

  const search =
    String(
      byId(
        'searchInput'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase()


  const brand =
    byId(
      'brandFilter'
    )?.value ||
    'Все'


  const size =
    byId(
      'sizeFilter'
    )?.value ||
    'Все'


  const minPrice =
    Number(
      byId(
        'minPriceFilter'
      )?.value ||
      0
    )


  const maxPrice =
    Number(
      byId(
        'maxPriceFilter'
      )?.value ||
      0
    )


  const category =
    getSelectedCategory()


  let result =
    products.filter(
      product => {

        if (
          category !==
            'Все' &&
          product.category !==
            category
        ) {
          return false
        }


        if (
          brand !==
            'Все' &&
          product.brand !==
            brand
        ) {
          return false
        }


        if (
          size !==
          'Все'
        ) {

          const available =
            getAvailableSizes(
              product
            )

          if (
            !available.includes(
              size
            )
          ) {
            return false
          }
        }


        if (
          minPrice &&
          product.price <
            minPrice
        ) {
          return false
        }


        if (
          maxPrice &&
          product.price >
            maxPrice
        ) {
          return false
        }


        if (search) {

          const haystack =
            [
              product.brand,
              product.name,
              product.category
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()


          if (
            !haystack.includes(
              search
            )
          ) {
            return false
          }
        }


        return true
      }
    )


  const sort =
    byId(
      'sortSelect'
    )?.value ||
    'newest'


  if (
    sort ===
    'priceAsc'
  ) {
    result.sort(
      (
        a,
        b
      ) =>
        a.price -
        b.price
    )
  }


  if (
    sort ===
    'priceDesc'
  ) {
    result.sort(
      (
        a,
        b
      ) =>
        b.price -
        a.price
    )
  }


  if (
    sort ===
    'newest'
  ) {
    result.sort(
      (
        a,
        b
      ) =>
        new Date(
          b.created_at ||
          0
        ) -
        new Date(
          a.created_at ||
          0
        )
    )
  }


  return result
}


// ======================================================
// PRODUCT CARD
// ======================================================

function createProductCard(
  product
) {

  const image =
    getProductImage(
      product
    )


  const soldOut =
    !productHasStock(
      product
    )


  const isFavorite =
    favorites.has(
      Number(
        product.id
      )
    )


  return `
    <article
      class="product-card ${
        soldOut
          ? 'sold-out-card'
          : ''
      }"
      data-product-id="${product.id}"
    >

      <div class="product-card-media">

        <button
          class="product-open-btn"
          type="button"
          data-open-product="${product.id}"
        >

          <div class="product-image">

            ${
              image
                ? `
                  <img
                    src="${escapeHtml(
                      image
                    )}"
                    alt="${escapeHtml(
                      product.name
                    )}"
                    loading="lazy"
                  >
                `
                : `
                  <span>
                    —
                  </span>
                `
            }

          </div>

        </button>


        ${
          soldOut
            ? `
              <div class="sold-out-badge">
                НЕТ В НАЛИЧИИ
              </div>
            `
            : ''
        }


        <button
          class="favorite-btn ${
            isFavorite
              ? 'active'
              : ''
          }"
          type="button"
          data-favorite-product="${product.id}"
          aria-label="Избранное"
        >
          ${
            isFavorite
              ? '♥'
              : '♡'
          }
        </button>

      </div>


      <button
        class="product-info-btn"
        type="button"
        data-open-product="${product.id}"
      >

        <div class="brand">
          ${escapeHtml(
            product.brand
          )}
        </div>

        <div class="product-name">
          ${escapeHtml(
            product.name
          )}
        </div>

        <div class="price">
          ${formatPrice(
            product.price
          )}
        </div>

      </button>

    </article>
  `
}


// ======================================================
// RENDER CATALOG
// ======================================================

function renderProducts() {

  const grid =
    byId(
      'productGrid'
    )


  if (!grid) {
    return
  }


  filteredProducts =
    getFilteredProducts()


  const resultCount =
    byId(
      'resultCount'
    )


  if (resultCount) {
    resultCount.textContent =
      `${filteredProducts.length} ${
        filteredProducts.length === 1
          ? 'товар'
          : 'товаров'
      }`
  }


  if (
    !filteredProducts.length
  ) {

    grid.innerHTML =
      `
        <div class="empty product-grid-empty">
          По выбранным параметрам ничего не найдено
        </div>
      `

    return
  }


  grid.innerHTML =
    filteredProducts
      .map(
        createProductCard
      )
      .join('')


  bindProductCardEvents(
    grid
  )
}


// ======================================================
// CATALOG EVENTS
// ======================================================

function bindProductCardEvents(
  container
) {

  container
    .querySelectorAll(
      '[data-open-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const id =
              Number(
                button.dataset
                  .openProduct
              )

            openProduct(
              id
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-favorite-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          async event => {

            event.stopPropagation()

            const id =
              Number(
                button.dataset
                  .favoriteProduct
              )

            await toggleFavorite(
              id
            )
          }
        )
      }
    )
}


// ======================================================
// FILTER EVENTS
// ======================================================

function setupFilters() {

  const ids = [
    'searchInput',
    'brandFilter',
    'sizeFilter',
    'minPriceFilter',
    'maxPriceFilter',
    'sortSelect'
  ]


  ids.forEach(
    id => {

      const element =
        byId(id)

      if (!element) {
        return
      }


      element.addEventListener(
        id ===
          'searchInput' ||
        id ===
          'minPriceFilter' ||
        id ===
          'maxPriceFilter'
          ? 'input'
          : 'change',
        renderProducts
      )
    }
  )


  byId(
    'resetFiltersBtn'
  )?.addEventListener(
    'click',
    () => {

      const search =
        byId(
          'searchInput'
        )

      const brand =
        byId(
          'brandFilter'
        )

      const size =
        byId(
          'sizeFilter'
        )

      const min =
        byId(
          'minPriceFilter'
        )

      const max =
        byId(
          'maxPriceFilter'
        )

      const sort =
        byId(
          'sortSelect'
        )


      if (search) {
        search.value = ''
      }

      if (brand) {
        brand.value = 'Все'
      }

      if (size) {
        size.value = 'Все'
      }

      if (min) {
        min.value = ''
      }

      if (max) {
        max.value = ''
      }

      if (sort) {
        sort.value =
          'newest'
      }


      byId(
        'categoryTabs'
      )
        ?.querySelectorAll(
          '.tab'
        )
        .forEach(
          (
            tab,
            index
          ) => {

            tab.classList.toggle(
              'active',
              index === 0
            )
          }
        )


      renderProducts()
    }
  )
}


// ======================================================
// HOME NEW PRODUCTS
// ======================================================

function createHomeProduct(
  product
) {

  const image =
    getProductImage(
      product
    )


  return `
    <button
      class="home-mini-product"
      type="button"
      data-home-product="${product.id}"
    >

      <div class="home-mini-product-image">

        ${
          image
            ? `
              <img
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  product.name
                )}"
                loading="lazy"
              >
            `
            : ''
        }

      </div>


      <div class="home-mini-product-brand">
        ${escapeHtml(
          product.brand
        )}
      </div>


      <div class="home-mini-product-name">
        ${escapeHtml(
          product.name
        )}
      </div>


      <div class="home-mini-product-price">
        ${formatPrice(
          product.price
        )}
      </div>

    </button>
  `
}


function renderHomeNewProducts() {

  const container =
    byId(
      'homeNewProducts'
    )


  if (!container) {
    return
  }


  const newest =
    products
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.created_at ||
            0
          ) -
          new Date(
            a.created_at ||
            0
          )
      )
      .slice(
        0,
        10
      )


  if (
    !newest.length
  ) {
    container.innerHTML =
      `
        <div class="empty">
          Товаров пока нет
        </div>
      `

    return
  }


  container.innerHTML =
    newest
      .map(
        createHomeProduct
      )
      .join('')


  container
    .querySelectorAll(
      '[data-home-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openProduct(
              Number(
                button.dataset
                  .homeProduct
              )
            )
          }
        )
      }
    )
}


// ======================================================
// HOME BRANDS
// ======================================================

function renderHomeBrands() {

  const container =
    byId(
      'homeBrands'
    )


  if (!container) {
    return
  }


  const brands =
    [
      ...new Set(
        products
          .map(
            product =>
              product.brand
          )
          .filter(Boolean)
      )
    ]
      .sort(
        (
          a,
          b
        ) =>
          a.localeCompare(
            b,
            'ru'
          )
      )


  if (!brands.length) {
    container.innerHTML =
      `
        <div class="empty">
          Брендов пока нет
        </div>
      `

    return
  }


  container.innerHTML =
    brands
      .map(
        brand =>
          `
            <button
              class="home-brand-btn"
              type="button"
              data-home-brand="${escapeHtml(
                brand
              )}"
            >
              ${escapeHtml(
                brand
              )}
            </button>
          `
      )
      .join('')


  container
    .querySelectorAll(
      '[data-home-brand]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            showSection(
              'stock'
            )


            const brandFilter =
              byId(
                'brandFilter'
              )


            if (brandFilter) {
              brandFilter.value =
                button.dataset
                  .homeBrand
            }


            renderProducts()
          }
        )
      }
    )
}


// ======================================================
// HOME POPULAR PRODUCTS
// ======================================================

async function loadPopularProducts() {

  const container =
    byId(
      'homePopularProducts'
    )


  if (!container) {
    return
  }


  try {

    const result =
      await callStoreFeatures(
        'popular_products'
      )


    let popular =
      Array.isArray(
        result.products
      )
        ? result.products.map(
            normalizeProduct
          )
        : []


    if (
      !popular.length
    ) {
      popular =
        products.slice(
          0,
          8
        )
    }


    container.innerHTML =
      popular
        .slice(
          0,
          10
        )
        .map(
          createHomeProduct
        )
        .join('')


    container
      .querySelectorAll(
        '[data-home-product]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () => {

              openProduct(
                Number(
                  button.dataset
                    .homeProduct
                )
              )
            }
          )
        }
      )

  } catch (
    error
  ) {

    console.error(
      'Popular products:',
      error
    )


    const fallback =
      products.slice(
        0,
        8
      )


    container.innerHTML =
      fallback
        .map(
          createHomeProduct
        )
        .join('')


    container
      .querySelectorAll(
        '[data-home-product]'
      )
      .forEach(
        button => {

          button.addEventListener(
            'click',
            () =>
              openProduct(
                Number(
                  button.dataset
                    .homeProduct
                )
              )
          )
        }
      )
  }
}


// ======================================================
// FAVORITES COUNT
// ======================================================

function updateFavoritesCount() {

  const element =
    byId(
      'favoritesCount'
    )


  if (element) {
    element.textContent =
      String(
        favorites.size
      )
  }
}


// ======================================================
// CART COUNT
// ======================================================

function updateCartCount() {

  const count =
    cart.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ||
          1
        ),
      0
    )


  const element =
    byId(
      'cartCount'
    )


  if (element) {
    element.textContent =
      String(count)
  }
// ======================================================
// PRODUCT SHEET / OPEN PRODUCT
// ======================================================

async function openProduct(
  productId
) {

  const product =
    products.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    ) ||
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (!product) {
    return
  }


  currentProduct =
    product


  selectedVariant =
    (
      product.variants ||
      []
    ).find(
      variant =>
        Number(
          variant.stock
        ) > 0
    ) ||
    null


  currentGalleryIndex =
    0


  renderProductSheet()


  byId(
    'sheetBackdrop'
  )?.classList.remove(
    'hidden'
  )


  byId(
    'productSheet'
  )?.classList.remove(
    'hidden'
  )


  document.body.style.overflow =
    'hidden'


  trackProductView(
    product.id
  )
}


function closeSheets() {

  [
    'productSheet',
    'cartSheet',
    'checkoutSheet',
    'sheetBackdrop'
  ].forEach(
    id =>
      byId(id)
        ?.classList
        .add(
          'hidden'
        )
  )


  document.body.style.overflow =
    ''
}


// ======================================================
// PRODUCT VIEW TRACKING
// ======================================================

async function trackProductView(
  productId
) {

  if (
    !INIT_DATA ||
    !productId
  ) {
    return
  }


  try {

    await callStoreFeatures(
      'product_view',
      {
        product_id:
          Number(
            productId
          )
      }
    )

  } catch (
    error
  ) {

    console.error(
      'Product view:',
      error
    )
  }
}


// ======================================================
// PRODUCT GALLERY
// ======================================================

function getCurrentProductImages() {

  if (!currentProduct) {
    return []
  }


  const images =
    Array.isArray(
      currentProduct.images
    )
      ? currentProduct
          .images
          .filter(Boolean)
      : []


  if (
    !images.length &&
    currentProduct.image_url
  ) {
    return [
      currentProduct.image_url
    ]
  }


  return images
}


function renderGallery() {

  const images =
    getCurrentProductImages()


  if (!images.length) {

    return `
      <div class="product-gallery">

        <div
          style="
            width:100%;
            height:100%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#999;
          "
        >
          Нет фото
        </div>

      </div>
    `
  }


  return `
    <div
      class="product-gallery"
      id="productGallery"
    >

      ${images
        .map(
          (
            image,
            index
          ) =>
            `
              <img
                class="gallery-image ${
                  index ===
                  currentGalleryIndex
                    ? 'active'
                    : ''
                }"
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  currentProduct?.name ||
                  ''
                )}"
                draggable="false"
              >
            `
        )
        .join('')}


      ${
        images.length > 1
          ? `
            <button
              class="gallery-prev"
              id="galleryPrevBtn"
              type="button"
            >
              ‹
            </button>

            <button
              class="gallery-next"
              id="galleryNextBtn"
              type="button"
            >
              ›
            </button>

            <div
              class="gallery-counter"
              id="galleryCounter"
            >
              ${
                currentGalleryIndex +
                1
              }
              /
              ${images.length}
            </div>

            <div class="gallery-dots">

              ${images
                .map(
                  (
                    _,
                    index
                  ) =>
                    `
                      <span
                        class="gallery-dot ${
                          index ===
                          currentGalleryIndex
                            ? 'active'
                            : ''
                        }"
                      ></span>
                    `
                )
                .join('')}

            </div>
          `
          : ''
      }

    </div>
  `
}


function showGalleryImage(
  index
) {

  const images =
    getCurrentProductImages()


  if (
    !images.length
  ) {
    return
  }


  currentGalleryIndex =
    (
      index +
      images.length
    ) %
    images.length


  $$('.gallery-image')
    .forEach(
      (
        image,
        imageIndex
      ) => {

        image.classList.toggle(
          'active',
          imageIndex ===
          currentGalleryIndex
        )
      }
    )


  $$('.gallery-dot')
    .forEach(
      (
        dot,
        dotIndex
      ) => {

        dot.classList.toggle(
          'active',
          dotIndex ===
          currentGalleryIndex
        )
      }
    )


  const counter =
    byId(
      'galleryCounter'
    )


  if (counter) {

    counter.textContent =
      `${currentGalleryIndex + 1} / ${images.length}`
  }
}


function setupGalleryEvents() {

  const images =
    getCurrentProductImages()


  if (
    images.length <=
    1
  ) {
    return
  }


  byId(
    'galleryPrevBtn'
  )?.addEventListener(
    'click',
    () =>
      showGalleryImage(
        currentGalleryIndex -
        1
      )
  )


  byId(
    'galleryNextBtn'
  )?.addEventListener(
    'click',
    () =>
      showGalleryImage(
        currentGalleryIndex +
        1
      )
  )


  const gallery =
    byId(
      'productGallery'
    )


  if (!gallery) {
    return
  }


  let startX =
    null


  gallery.addEventListener(
    'touchstart',
    event => {

      startX =
        event
          .changedTouches?.[0]
          ?.clientX ??
        null
    },
    {
      passive:
        true
    }
  )


  gallery.addEventListener(
    'touchend',
    event => {

      if (
        startX ===
        null
      ) {
        return
      }


      const endX =
        event
          .changedTouches?.[0]
          ?.clientX ??
        startX


      const diff =
        endX -
        startX


      startX =
        null


      if (
        Math.abs(
          diff
        ) < 45
      ) {
        return
      }


      if (
        diff < 0
      ) {

        showGalleryImage(
          currentGalleryIndex +
          1
        )

      } else {

        showGalleryImage(
          currentGalleryIndex -
          1
        )
      }
    },
    {
      passive:
        true
    }
  )
}


// ======================================================
// PRODUCT REVIEWS
// ======================================================

async function loadProductReviews(
  productId
) {

  if (!productId) {
    return []
  }


  if (
    productReviewsCache.has(
      Number(
        productId
      )
    )
  ) {
    return (
      productReviewsCache.get(
        Number(
          productId
        )
      ) ||
      []
    )
  }


  try {

    const result =
      await callStoreFeatures(
        'public_reviews',
        {
          product_id:
            Number(
              productId
            )
        }
      )


    const reviews =
      Array.isArray(
        result.reviews
      )
        ? result.reviews
        : []


    productReviewsCache.set(
      Number(
        productId
      ),
      reviews
    )


    return reviews

  } catch (
    error
  ) {

    console.error(
      'Product reviews:',
      error
    )

    return []
  }
}


function renderProductReviews(
  reviews
) {

  if (
    !Array.isArray(
      reviews
    ) ||
    !reviews.length
  ) {

    return `
      <div class="product-reviews-block">

        <div class="product-reviews-title">
          Отзывы
        </div>

        <div class="muted">
          Отзывов об этом товаре пока нет.
        </div>

      </div>
    `
  }


  return `
    <div class="product-reviews-block">

      <div class="product-reviews-title">
        Отзывы
      </div>

      ${reviews
        .slice(
          0,
          10
        )
        .map(
          review => {

            const rating =
              Number(
                review.rating ||
                0
              )

            const username =
              review.telegram_username
                ? `@${String(
                    review.telegram_username
                  ).replace(
                    /^@/,
                    ''
                  )}`
                : 'Покупатель'


            return `
              <div class="product-review-item">

                <div class="product-review-rating">
                  ${'★'.repeat(
                    Math.max(
                      0,
                      Math.min(
                        5,
                        rating
                      )
                    )
                  )}
                  ${'☆'.repeat(
                    Math.max(
                      0,
                      5 -
                      Math.min(
                        5,
                        rating
                      )
                    )
                  )}
                </div>

                <div
                  class="muted"
                  style="margin-bottom:5px"
                >
                  ${escapeHtml(
                    username
                  )}
                </div>

                ${
                  review.review_text
                    ? `
                      <div class="product-review-text">
                        ${escapeHtml(
                          review.review_text
                        )}
                      </div>
                    `
                    : ''
                }

              </div>
            `
          }
        )
        .join('')}

    </div>
  `
}


// ======================================================
// RENDER PRODUCT SHEET
// ======================================================

async function renderProductSheet() {

  const container =
    byId(
      'productSheetContent'
    )


  if (
    !container ||
    !currentProduct
  ) {
    return
  }


  const product =
    currentProduct


  const soldOut =
    !productHasStock(
      product
    )


  const isFavorite =
    favorites.has(
      Number(
        product.id
      )
    )


  const isBrandSubscribed =
    subscribedBrands.has(
      String(
        product.brand
      )
    )


  const description =
    String(
      product.description ||
      ''
    )
      .trim()


  container.innerHTML =
    `
      ${renderGallery()}


      <div class="product-sheet-title-row">

        <div>

          <div class="brand">
            ${escapeHtml(
              product.brand
            )}
          </div>

          <div class="detail-title">
            ${escapeHtml(
              product.name
            )}
          </div>

        </div>


        <button
          id="sheetFavoriteBtn"
          class="sheet-favorite-btn ${
            isFavorite
              ? 'active'
              : ''
          }"
          type="button"
          aria-label="Избранное"
        >
          ${
            isFavorite
              ? '♥'
              : '♡'
          }
        </button>

      </div>


      <div class="detail-price">
        ${formatPrice(
          product.price
        )}
      </div>


      ${
        soldOut
          ? `
            <div class="product-sold-out-label">
              Нет в наличии
            </div>
          `
          : ''
      }


      ${
        description
          ? `
            <div class="product-description">
              ${escapeHtml(
                description
              ).replace(
                /\n/g,
                '<br>'
              )}
            </div>
          `
          : ''
      }


      <div class="muted">
        Размер
      </div>


      <div
        id="variantList"
        class="variant-list"
      >

        ${
          (
            product.variants ||
            []
          ).length

            ? product.variants
                .map(
                  (
                    variant,
                    index
                  ) => {

                    const available =
                      Number(
                        variant.stock
                      ) > 0


                    const active =
                      selectedVariant ===
                      variant


                    return `
                      <button
                        class="variant-btn ${
                          active
                            ? 'active'
                            : ''
                        } ${
                          !available
                            ? 'sold-out'
                            : ''
                        }"
                        type="button"
                        data-variant-index="${index}"
                        ${
                          !available
                            ? 'disabled'
                            : ''
                        }
                      >
                        ${escapeHtml(
                          variant.size ||
                          'Размер'
                        )}
                      </button>
                    `
                  }
                )
                .join('')

            : `
              <div class="muted">
                Размер не указан
              </div>
            `
        }

      </div>


      <div class="product-main-actions">

        <button
          id="addToCartBtn"
          class="primary-btn"
          type="button"
          ${
            soldOut
              ? 'disabled'
              : ''
          }
        >
          ${
            soldOut
              ? 'Нет в наличии'
              : 'Добавить в корзину'
          }
        </button>


        <button
          id="brandSubscribeBtn"
          class="secondary-btn brand-subscribe-btn"
          type="button"
        >
          ${
            isBrandSubscribed
              ? `Не следить за ${escapeHtml(
                  product.brand
                )}`
              : `Следить за ${escapeHtml(
                  product.brand
                )}`
          }
        </button>


        <button
          id="findCustomOrderBtn"
          class="secondary-btn full-width-btn"
          type="button"
        >
          Найти другой размер под заказ
        </button>


        <button
          id="shareProductBtn"
          class="secondary-btn share-product-btn"
          type="button"
        >
          Поделиться
        </button>

      </div>


      <div
        id="productReviewsContainer"
      >

        <div class="product-reviews-block">

          <div class="product-reviews-title">
            Отзывы
          </div>

          <div class="muted">
            Загружаем...
          </div>

        </div>

      </div>


      ${
        IS_ADMIN
          ? renderProductAdminActions(
              product
            )
          : ''
      }
    `


  setupGalleryEvents()


  setupProductSheetEvents()


  const reviews =
    await loadProductReviews(
      product.id
    )


  const reviewsContainer =
    byId(
      'productReviewsContainer'
    )


  if (
    reviewsContainer &&
    currentProduct?.id ===
      product.id
  ) {
    reviewsContainer.innerHTML =
      renderProductReviews(
        reviews
      )
  }
}


// ======================================================
// PRODUCT SHEET EVENTS
// ======================================================

function setupProductSheetEvents() {

  if (!currentProduct) {
    return
  }


  const product =
    currentProduct


  byId(
    'sheetFavoriteBtn'
  )?.addEventListener(
    'click',
    async () => {

      await toggleFavorite(
        product.id
      )


      if (
        currentProduct?.id ===
        product.id
      ) {
        renderProductSheet()
      }
    }
  )


  byId(
    'variantList'
  )
    ?.querySelectorAll(
      '[data-variant-index]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const index =
              Number(
                button.dataset
                  .variantIndex
              )


            const variant =
              product
                .variants?.[
                  index
                ]


            if (
              !variant ||
              Number(
                variant.stock
              ) <= 0
            ) {
              return
            }


            selectedVariant =
              variant


            renderProductSheet()
          }
        )
      }
    )


  byId(
    'addToCartBtn'
  )?.addEventListener(
    'click',
    () => {

      if (
        !productHasStock(
          product
        )
      ) {
        return
      }


      let variant =
        selectedVariant


      if (
        !variant &&
        (
          product.variants ||
          []
        ).length
      ) {

        variant =
          product.variants.find(
            item =>
              Number(
                item.stock
              ) > 0
          ) ||
          null
      }


      if (
        (
          product.variants ||
          []
        ).length &&
        !variant
      ) {

        alert(
          'Выберите размер'
        )

        return
      }


      addProductToCart(
        product,
        variant
      )
    }
  )


  byId(
    'brandSubscribeBtn'
  )?.addEventListener(
    'click',
    async () => {

      await toggleBrandSubscription(
        product.brand
      )


      if (
        currentProduct?.id ===
        product.id
      ) {
        renderProductSheet()
      }
    }
  )


  byId(
    'findCustomOrderBtn'
  )?.addEventListener(
    'click',
    () => {

      closeSheets()

      showSection(
        'custom'
      )


      const nameInput =
        byId(
          'customOrderProductName'
        )


      const sizeInput =
        byId(
          'customOrderSize'
        )


      const commentInput =
        byId(
          'customOrderComment'
        )


      if (nameInput) {

        nameInput.value =
          `${product.brand} ${product.name}`
            .trim()
      }


      if (sizeInput) {
        sizeInput.value =
          ''
      }


      if (
        commentInput
      ) {

        commentInput.value =
          'Нужен другой размер этого товара'
      }
    }
  )


  byId(
    'shareProductBtn'
  )?.addEventListener(
    'click',
    () =>
      shareProduct(
        product
      )
  )


  if (IS_ADMIN) {
    setupProductAdminEvents(
      product
    )
  }
}


// ======================================================
// FAVORITES
// ======================================================

async function toggleFavorite(
  productId
) {

  const id =
    Number(
      productId
    )


  if (!id) {
    return
  }


  const currentlyFavorite =
    favorites.has(
      id
    )


  if (currentlyFavorite) {

    favorites.delete(
      id
    )

  } else {

    favorites.add(
      id
    )
  }


  saveLocalFavorites()

  updateFavoritesCount()

  renderProducts()


  if (
    !INIT_DATA
  ) {
    return
  }


  try {

    if (
      currentlyFavorite
    ) {

      await callStoreFeatures(
        'favorite_remove',
        {
          product_id:
            id
        }
      )

    } else {

      await callStoreFeatures(
        'favorite_add',
        {
          product_id:
            id
        }
      )
    }

  } catch (
    error
  ) {

    console.error(
      'Favorite sync:',
      error
    )
  }
}


// ======================================================
// FAVORITES BUTTON
// ======================================================

function setupFavoritesButton() {

  byId(
    'favoritesButton'
  )?.addEventListener(
    'click',
    () => {

      showSection(
        'stock'
      )


      const favoriteProducts =
        products.filter(
          product =>
            favorites.has(
              Number(
                product.id
              )
            )
        )


      const grid =
        byId(
          'productGrid'
        )


      if (!grid) {
        return
      }


      const title =
        byId(
          'catalogTitle'
        )


      const count =
        byId(
          'resultCount'
        )


      if (title) {
        title.textContent =
          'Избранное'
      }


      if (count) {
        count.textContent =
          `${favoriteProducts.length} товаров`
      }


      if (
        !favoriteProducts.length
      ) {

        grid.innerHTML =
          `
            <div class="empty product-grid-empty">
              В избранном пока ничего нет
            </div>
          `

        return
      }


      grid.innerHTML =
        favoriteProducts
          .map(
            createProductCard
          )
          .join('')


      bindProductCardEvents(
        grid
      )
    }
  )
}


// ======================================================
// BRAND SUBSCRIPTIONS
// ======================================================

async function loadBrandSubscriptions() {

  if (!INIT_DATA) {
    return
  }


  try {

    const result =
      await callStoreFeatures(
        'my_brand_subscriptions'
      )


    subscribedBrands =
      new Set(
        (
          result.subscriptions ||
          []
        )
          .map(
            item =>
              String(
                item.brand ||
                ''
              )
          )
          .filter(Boolean)
      )


    renderBrandSubscriptions()

  } catch (
    error
  ) {

    console.error(
      'Brand subscriptions:',
      error
    )
  }
}


async function toggleBrandSubscription(
  brand
) {

  const normalizedBrand =
    String(
      brand ||
      ''
    ).trim()


  if (!normalizedBrand) {
    return
  }


  if (!INIT_DATA) {

    alert(
      'Открой магазин через Telegram'
    )

    return
  }


  const currentlySubscribed =
    subscribedBrands.has(
      normalizedBrand
    )


  try {

    if (
      currentlySubscribed
    ) {

      await callStoreFeatures(
        'brand_unsubscribe',
        {
          brand:
            normalizedBrand
        }
      )


      subscribedBrands.delete(
        normalizedBrand
      )

    } else {

      await callStoreFeatures(
        'brand_subscribe',
        {
          brand:
            normalizedBrand
        }
      )


      subscribedBrands.add(
        normalizedBrand
      )
    }


    renderBrandSubscriptions()


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить подписку'
    )
  }
}


function renderBrandSubscriptions() {

  const container =
    byId(
      'brandSubscriptionsList'
    )


  if (!container) {
    return
  }


  const brands =
    [
      ...subscribedBrands
    ]
      .sort(
        (
          a,
          b
        ) =>
          a.localeCompare(
            b,
            'ru'
          )
      )


  if (
    !brands.length
  ) {

    container.innerHTML =
      `
        <div class="empty">
          Ты пока не подписан ни на один бренд.
        </div>
      `

    return
  }


  container.innerHTML =
    brands
      .map(
        brand =>
          `
            <div class="brand-subscription-item">

              <span class="brand-subscription-name">
                ${escapeHtml(
                  brand
                )}
              </span>

              <button
                class="brand-subscription-remove"
                type="button"
                data-unsubscribe-brand="${escapeHtml(
                  brand
                )}"
              >
                Отписаться
              </button>

            </div>
          `
      )
      .join('')


  container
    .querySelectorAll(
      '[data-unsubscribe-brand]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            toggleBrandSubscription(
              button.dataset
                .unsubscribeBrand
            )
        )
      }
    )
}


// ======================================================
// CART
// ======================================================

function addProductToCart(
  product,
  variant
) {

  const variantName =
    variant
      ? String(
          variant.size ||
          ''
        )
      : ''


  const existing =
    cart.find(
      item =>
        Number(
          item.product_id
        ) ===
          Number(
            product.id
          ) &&
        String(
          item.variant ||
          ''
        ) ===
          variantName
    )


  if (existing) {

    existing.quantity =
      Number(
        existing.quantity ||
        1
      ) +
      1

  } else {

    cart.push({
      product_id:
        Number(
          product.id
        ),

      brand:
        product.brand,

      name:
        product.name,

      price:
        Number(
          product.price
        ),

      image:
        getProductImage(
          product
        ),

      variant:
        variantName,

      quantity:
        1
    })
  }


  saveLocalCart()

  updateCartCount()

  closeSheets()


  tg
    ?.HapticFeedback
    ?.notificationOccurred(
      'success'
    )
}


function getCartSubtotal() {

  return cart.reduce(
    (
      total,
      item
    ) =>
      total +
      Number(
        item.price ||
        0
      ) *
      Number(
        item.quantity ||
        1
      ),
    0
  )
}


function renderCart() {

  const container =
    byId(
      'cartItems'
    )


  if (!container) {
    return
  }


  if (
    !cart.length
  ) {

    container.innerHTML =
      `
        <div class="empty">
          Корзина пока пустая
        </div>
      `

  } else {

    container.innerHTML =
      cart
        .map(
          (
            item,
            index
          ) =>
            `
              <div class="cart-item">

                <div class="cart-item-main">

                  ${
                    item.image
                      ? `
                        <img
                          class="cart-thumb"
                          src="${escapeHtml(
                            item.image
                          )}"
                          alt="${escapeHtml(
                            item.name
                          )}"
                        >
                      `
                      : ''
                  }

                  <div>

                    <div class="brand">
                      ${escapeHtml(
                        item.brand
                      )}
                    </div>

                    <strong>
                      ${escapeHtml(
                        item.name
                      )}
                    </strong>

                    ${
                      item.variant
                        ? `
                          <div class="muted">
                            Размер:
                            ${escapeHtml(
                              item.variant
                            )}
                          </div>
                        `
                        : ''
                    }

                    ${
                      Number(
                        item.quantity ||
                        1
                      ) > 1
                        ? `
                          <div class="muted">
                            Количество:
                            ${Number(
                              item.quantity
                            )}
                          </div>
                        `
                        : ''
                    }

                  </div>

                </div>


                <div class="cart-item-right">

                  <strong>
                    ${formatPrice(
                      Number(
                        item.price
                      ) *
                      Number(
                        item.quantity ||
                        1
                      )
                    )}
                  </strong>

                  <button
                    class="secondary-btn"
                    type="button"
                    data-remove-cart-index="${index}"
                  >
                    Удалить
                  </button>

                </div>

              </div>
            `
        )
        .join('')
  }


  const total =
    getCartSubtotal()


  const totalElement =
    byId(
      'cartTotal'
    )


  if (totalElement) {
    totalElement.textContent =
      formatPrice(
        total
      )
  }


  const checkoutButton =
    byId(
      'checkoutButton'
    )


  if (checkoutButton) {
    checkoutButton.disabled =
      !cart.length
  }


  container
    .querySelectorAll(
      '[data-remove-cart-index]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const index =
              Number(
                button.dataset
                  .removeCartIndex
              )


            cart.splice(
              index,
              1
            )


            saveLocalCart()

            updateCartCount()

            renderCart()
          }
        )
      }
    )
}


function openCart() {

  renderCart()


  byId(
    'sheetBackdrop'
  )?.classList.remove(
    'hidden'
  )


  byId(
    'cartSheet'
  )?.classList.remove(
    'hidden'
  )


  document.body.style.overflow =
    'hidden'
}


// ======================================================
// CART EVENTS
// ======================================================

function setupCartEvents() {

  byId(
    'cartButton'
  )?.addEventListener(
    'click',
    openCart
  )


  byId(
    'closeProductSheet'
  )?.addEventListener(
    'click',
    closeSheets
  )


  byId(
    'closeCartSheet'
  )?.addEventListener(
    'click',
    closeSheets
  )


  byId(
    'closeCheckoutSheet'
  )?.addEventListener(
    'click',
    closeSheets
  )


  byId(
    'sheetBackdrop'
  )?.addEventListener(
    'click',
    closeSheets
  )


  byId(
    'checkoutButton'
  )?.addEventListener(
    'click',
    () => {

      if (
        !cart.length
      ) {
        return
      }


      byId(
        'cartSheet'
      )?.classList.add(
        'hidden'
      )


      byId(
        'checkoutSheet'
      )?.classList.remove(
        'hidden'
      )


      resetAppliedPromo()

      updateCheckoutSummary()
    }
  )
}


// ======================================================
// SHARE PRODUCT
// ======================================================

async function shareProduct(
  product
) {

  const url =
    `https://t.me/${BOT_USERNAME}?startapp=product_${product.id}`


  const text =
    `${product.brand} ${product.name}\n${formatPrice(
      product.price
    )}`


  try {

    if (
      navigator.share
    ) {

      await navigator.share({
        title:
          `${product.brand} ${product.name}`,

        text,

        url
      })

      return
    }


    if (
      navigator.clipboard
        ?.writeText
    ) {

      await navigator.clipboard
        .writeText(
          `${text}\n${url}`
        )


      alert(
        'Ссылка на товар скопирована'
      )

      return
    }


    tg?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(
        text
      )}`
    )

  } catch (
    error
  ) {

    if (
      error?.name !==
      'AbortError'
    ) {
      console.error(
        error
      )
    }
  }
}
// ======================================================
// PROMOCODES
// ======================================================

function resetAppliedPromo() {

  appliedPromo =
    null

  checkoutDiscount =
    0

  const input =
    byId(
      'checkoutPromoCode'
    )

  const status =
    byId(
      'promoStatus'
    )


  if (input) {
    input.value =
      ''
  }


  if (status) {
    status.textContent =
      ''
  }


  byId(
    'checkoutDiscountRow'
  )?.classList.add(
    'hidden'
  )
}


function updateCheckoutSummary() {

  checkoutSubtotal =
    getCartSubtotal()


  checkoutDiscount =
    appliedPromo
      ? Number(
          appliedPromo.discount ||
          0
        )
      : 0


  checkoutFinal =
    Math.max(
      0,
      checkoutSubtotal -
      checkoutDiscount
    )


  const subtotal =
    byId(
      'checkoutSubtotal'
    )

  const discount =
    byId(
      'checkoutDiscount'
    )

  const final =
    byId(
      'checkoutFinalTotal'
    )

  const discountRow =
    byId(
      'checkoutDiscountRow'
    )


  if (subtotal) {
    subtotal.textContent =
      formatPrice(
        checkoutSubtotal
      )
  }


  if (discount) {
    discount.textContent =
      `−${formatPrice(
        checkoutDiscount
      )}`
  }


  if (final) {
    final.textContent =
      formatPrice(
        checkoutFinal
      )
  }


  if (discountRow) {
    discountRow.classList.toggle(
      'hidden',
      !checkoutDiscount
    )
  }
}


async function applyPromoCode() {

  const input =
    byId(
      'checkoutPromoCode'
    )

  const button =
    byId(
      'applyPromoBtn'
    )

  const status =
    byId(
      'promoStatus'
    )


  const code =
    String(
      input?.value ||
      ''
    )
      .trim()
      .toUpperCase()


  if (!code) {

    setStatus(
      status,
      'Введите промокод.',
      'error'
    )

    return
  }


  if (
    !cart.length
  ) {

    setStatus(
      status,
      'Корзина пустая.',
      'error'
    )

    return
  }


  if (!INIT_DATA) {

    setStatus(
      status,
      'Открой магазин через Telegram.',
      'error'
    )

    return
  }


  try {

    if (button) {
      button.disabled =
        true

      button.textContent =
        'Проверяем...'
    }


    setStatus(
      status,
      ''
    )


    const subtotal =
      getCartSubtotal()


    const result =
      await callStoreFeatures(
        'validate_promo',
        {
          code,

          order_amount:
            subtotal
        }
      )


    appliedPromo = {
      ...result.promo,

      discount:
        Number(
          result.discount ||
          0
        ),

      final_amount:
        Number(
          result.final_amount ||
          subtotal
        )
    }


    updateCheckoutSummary()


    setStatus(
      status,
      `Промокод ${code} применён.`,
      'success'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    appliedPromo =
      null

    checkoutDiscount =
      0

    updateCheckoutSummary()


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Промокод недоступен.',
      'error'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'error'
      )

  } finally {

    if (button) {
      button.disabled =
        false

      button.textContent =
        'Применить промокод'
    }
  }
}


function setupPromoEvents() {

  byId(
    'applyPromoBtn'
  )?.addEventListener(
    'click',
    applyPromoCode
  )


  byId(
    'checkoutPromoCode'
  )?.addEventListener(
    'input',
    () => {

      if (!appliedPromo) {
        return
      }


      appliedPromo =
        null

      checkoutDiscount =
        0

      updateCheckoutSummary()


      setStatus(
        byId(
          'promoStatus'
        ),
        'Промокод изменён. Нажмите «Применить» ещё раз.'
      )
    }
  )
}


// ======================================================
// NORMAL ORDER
// ======================================================

async function submitNormalOrder(
  event
) {

  event.preventDefault()


  const status =
    byId(
      'checkoutStatus'
    )


  const telegram =
    normalizeUsername(
      byId(
        'stockTelegram'
      )?.value ||
      TELEGRAM_USERNAME
    )


  if (
    !cart.length
  ) {

    setStatus(
      status,
      'Корзина пустая.',
      'error'
    )

    return
  }


  if (!telegram) {

    setStatus(
      status,
      'Укажите ваш Telegram.',
      'error'
    )

    return
  }


  if (!INIT_DATA) {

    setStatus(
      status,
      'Открой магазин через Telegram.',
      'error'
    )

    return
  }


  const subtotal =
    getCartSubtotal()


  const discount =
    appliedPromo
      ? Number(
          appliedPromo.discount ||
          0
        )
      : 0


  const finalTotal =
    Math.max(
      0,
      subtotal -
      discount
    )


  const payload = {

    telegram_user: {
      username:
        telegram.replace(
          /^@/,
          ''
        )
    },

    telegram_init_data:
      INIT_DATA,

    customer: {
      telegram
    },

    items:
      cart.map(
        item => ({
          productId:
            item.product_id,

          brand:
            item.brand,

          name:
            item.name,

          variant:
            item.variant,

          price:
            Number(
              item.price
            ),

          quantity:
            Number(
              item.quantity ||
              1
            ),

          image:
            item.image ||
            ''
        })
      ),

    total:
      finalTotal,

    created_at:
      new Date()
        .toISOString()
  }


  try {

    setStatus(
      status,
      'Отправляем заявку...'
    )


    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/orders`,
        {
          method:
            'POST',

          headers: {
            apikey:
              SUPABASE_ANON_KEY,

            Authorization:
              `Bearer ${SUPABASE_ANON_KEY}`,

            'Content-Type':
              'application/json',

            Prefer:
              'return=minimal'
          },

          body:
            JSON.stringify(
              payload
            )
        }
      )


    if (!response.ok) {

      const text =
        await response.text()

      console.error(
        'ORDER ERROR:',
        text
      )

      throw new Error(
        'Не удалось сохранить заказ'
      )
    }


    // Отмечаем использование промокода

    if (
      appliedPromo?.id
    ) {

      try {

        await callStoreFeatures(
          'use_promo',
          {
            promo_id:
              Number(
                appliedPromo.id
              )
          }
        )

      } catch (
        error
      ) {

        console.error(
          'Promo use error:',
          error
        )
      }
    }


    // Если пользователь пришёл по рефералу,
    // переводим его приглашение в ordered

    try {

      await callStoreFeatures(
        'referral_ordered'
      )

    } catch (
      error
    ) {

      console.error(
        'Referral ordered:',
        error
      )
    }


    setStatus(
      status,
      'Заявка создана. Мы свяжемся с вами в Telegram.',
      'success'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    cart = []

    saveLocalCart()

    updateCartCount()


    resetAppliedPromo()

    updateCheckoutSummary()


    setTimeout(
      () => {
        closeSheets()
      },
      900
    )

  } catch (
    error
  ) {

    console.error(
      'Submit order:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Ошибка отправки. Попробуйте ещё раз.',
      'error'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'error'
      )
  }
}


function setupCheckoutEvents() {

  byId(
    'checkoutForm'
  )?.addEventListener(
    'submit',
    submitNormalOrder
  )
}


// ======================================================
// POIZON
// ======================================================

const POIZON_RATE =
  12.7

const POIZON_COMMISSION =
  700


function calculatePoizon() {

  const yuan =
    Number(
      byId(
        'poizonPrice'
      )?.value ||
      0
    )


  const weight =
    Number(
      byId(
        'poizonWeight'
      )?.value ||
      0
    )


  const deliveryRate =
    Number(
      byId(
        'poizonDelivery'
      )?.value ||
      850
    )


  const finalTotal =
    yuan *
      POIZON_RATE +
    weight *
      deliveryRate +
    POIZON_COMMISSION


  const output =
    byId(
      'poizonFinalTotal'
    )


  if (output) {

    output.textContent =
      formatPrice(
        Math.round(
          finalTotal
        )
      )
  }


  return Math.round(
    finalTotal
  )
}


function setupPoizonEvents() {

  $$('.delivery-option')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            $$('.delivery-option')
              .forEach(
                item =>
                  item.classList.remove(
                    'active'
                  )
              )


            button.classList.add(
              'active'
            )


            const hidden =
              byId(
                'poizonDelivery'
              )


            if (hidden) {
              hidden.value =
                String(
                  button.dataset.rate ||
                  850
                )
            }


            calculatePoizon()
          }
        )
      }
    )


  byId(
    'poizonPrice'
  )?.addEventListener(
    'input',
    calculatePoizon
  )


  byId(
    'poizonWeight'
  )?.addEventListener(
    'input',
    calculatePoizon
  )


  byId(
    'poizonOrderButton'
  )?.addEventListener(
    'click',
    submitPoizonOrder
  )
}


async function submitPoizonOrder() {

  const button =
    byId(
      'poizonOrderButton'
    )

  const status =
    byId(
      'poizonOrderStatus'
    )


  const yuan =
    Number(
      byId(
        'poizonPrice'
      )?.value ||
      0
    )


  const weight =
    Number(
      byId(
        'poizonWeight'
      )?.value ||
      0
    )


  const deliveryRate =
    Number(
      byId(
        'poizonDelivery'
      )?.value ||
      850
    )


  const telegram =
    normalizeUsername(
      byId(
        'poizonTelegram'
      )?.value ||
      TELEGRAM_USERNAME
    )


  if (
    !yuan ||
    yuan <= 0
  ) {

    setStatus(
      status,
      'Укажите стоимость товара.',
      'error'
    )

    return
  }


  if (
    !weight ||
    weight <= 0
  ) {

    setStatus(
      status,
      'Укажите вес товара.',
      'error'
    )

    return
  }


  if (!telegram) {

    setStatus(
      status,
      'Укажите ваш Telegram.',
      'error'
    )

    return
  }


  const finalTotal =
    calculatePoizon()


  const payload = {

    telegram,

    price_yuan:
      yuan,

    weight,

    delivery:
      deliveryRate ===
      2500
        ? 'Авиа'
        : 'Авто',

    total:
      finalTotal,

    created_at:
      new Date()
        .toISOString()
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Отправляем...'
    }


    setStatus(
      status,
      ''
    )


    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/poizon_orders`,
        {
          method:
            'POST',

          headers: {
            apikey:
              SUPABASE_ANON_KEY,

            Authorization:
              `Bearer ${SUPABASE_ANON_KEY}`,

            'Content-Type':
              'application/json',

            Prefer:
              'return=minimal'
          },

          body:
            JSON.stringify(
              payload
            )
        }
      )


    if (!response.ok) {

      console.error(
        'POIZON ERROR:',
        await response.text()
      )

      throw new Error(
        'Не удалось отправить заявку'
      )
    }


    setStatus(
      status,
      'Заявка отправлена. Мы свяжемся с вами в Telegram.',
      'success'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    const priceInput =
      byId(
        'poizonPrice'
      )

    const weightInput =
      byId(
        'poizonWeight'
      )


    if (priceInput) {
      priceInput.value =
        ''
    }

    if (weightInput) {
      weightInput.value =
        ''
    }


    calculatePoizon()

  } catch (
    error
  ) {

    console.error(
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Ошибка отправки.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Оформить заказ'
    }
  }
}


// ======================================================
// CUSTOMER ORDERS REQUEST
// ======================================================

async function customerOrdersRequest(
  payload
) {

  const response =
    await fetch(
      `${FUNCTIONS_URL}/customer-orders`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        },

        body:
          JSON.stringify({
            init_data:
              INIT_DATA,

            ...payload
          })
      }
    )


  const text =
    await response.text()


  let data = {}


  try {

    data =
      text
        ? JSON.parse(
            text
          )
        : {}

  } catch {
    data = {}
  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      text ||
      `Ошибка ${response.status}`
    )
  }


  return data
}


// ======================================================
// CUSTOM ORDER
// ======================================================

function setupCustomOrderEvents() {

  byId(
    'customOrderSubmit'
  )?.addEventListener(
    'click',
    submitCustomOrder
  )
}


async function submitCustomOrder() {

  const button =
    byId(
      'customOrderSubmit'
    )

  const status =
    byId(
      'customOrderStatus'
    )


  const productName =
    String(
      byId(
        'customOrderProductName'
      )?.value ||
      ''
    ).trim()


  const productUrl =
    String(
      byId(
        'customOrderUrl'
      )?.value ||
      ''
    ).trim()


  const size =
    String(
      byId(
        'customOrderSize'
      )?.value ||
      ''
    ).trim()


  const comment =
    String(
      byId(
        'customOrderComment'
      )?.value ||
      ''
    ).trim()


  const telegram =
    normalizeUsername(
      byId(
        'customOrderTelegram'
      )?.value ||
      TELEGRAM_USERNAME
    )


  if (
    !productName &&
    !productUrl
  ) {

    setStatus(
      status,
      'Укажи название товара или ссылку.',
      'error'
    )

    return
  }


  if (!size) {

    setStatus(
      status,
      'Укажи нужный размер.',
      'error'
    )

    return
  }


  if (!telegram) {

    setStatus(
      status,
      'Укажи свой Telegram.',
      'error'
    )

    return
  }


  if (!INIT_DATA) {

    setStatus(
      status,
      'Открой магазин через Telegram.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Отправляем...'
    }


    setStatus(
      status,
      ''
    )


    const result =
      await customerOrdersRequest({
        action:
          'create',

        product_name:
          productName,

        product_url:
          productUrl,

        size,

        comment,

        contact_telegram:
          telegram
      })


    setStatus(
      status,
      result.order?.id
        ? `Заявка №${result.order.id} отправлена.`
        : 'Заявка отправлена.',
      'success'
    )


    const ids = [
      'customOrderProductName',
      'customOrderUrl',
      'customOrderSize',
      'customOrderComment'
    ]


    ids.forEach(
      id => {

        const input =
          byId(id)

        if (input) {
          input.value =
            ''
        }
      }
    )


    if (
      byId(
        'customOrderTelegram'
      )
    ) {

      byId(
        'customOrderTelegram'
      ).value =
        TELEGRAM_USERNAME
    }


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      'Custom order:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Произошла ошибка.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Отправить заявку'
    }
  }
}


// ======================================================
// FIND CHEAPER
// ======================================================

function setupCheaperEvents() {

  byId(
    'cheaperSubmitBtn'
  )?.addEventListener(
    'click',
    submitCheaperRequest
  )
}


async function submitCheaperRequest() {

  const button =
    byId(
      'cheaperSubmitBtn'
    )

  const status =
    byId(
      'cheaperStatus'
    )


  const productUrl =
    String(
      byId(
        'cheaperProductUrl'
      )?.value ||
      ''
    ).trim()


  const productName =
    String(
      byId(
        'cheaperProductName'
      )?.value ||
      ''
    ).trim()


  const size =
    String(
      byId(
        'cheaperSize'
      )?.value ||
      ''
    ).trim()


  const currentPrice =
    Number(
      byId(
        'cheaperCurrentPrice'
      )?.value ||
      0
    )


  const desiredPrice =
    Number(
      byId(
        'cheaperDesiredPrice'
      )?.value ||
      0
    )


  const comment =
    String(
      byId(
        'cheaperComment'
      )?.value ||
      ''
    ).trim()


  if (!productUrl) {

    setStatus(
      status,
      'Добавь ссылку на товар.',
      'error'
    )

    return
  }


  if (!INIT_DATA) {

    setStatus(
      status,
      'Открой магазин через Telegram.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Отправляем...'
    }


    setStatus(
      status,
      ''
    )


    const result =
      await callStoreFeatures(
        'find_cheaper',
        {
          product_url:
            productUrl,

          product_name:
            productName,

          size,

          current_price:
            currentPrice ||
            null,

          desired_price:
            desiredPrice ||
            null,

          comment
        }
      )


    setStatus(
      status,
      result.request?.id
        ? `Заявка №${result.request.id} отправлена.`
        : 'Заявка отправлена.',
      'success'
    )


    const ids = [
      'cheaperProductUrl',
      'cheaperProductName',
      'cheaperSize',
      'cheaperCurrentPrice',
      'cheaperDesiredPrice',
      'cheaperComment'
    ]


    ids.forEach(
      id => {

        const input =
          byId(id)

        if (input) {
          input.value =
            ''
        }
      }
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      'Find cheaper:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось отправить заявку.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Отправить заявку'
    }
  }
}
  // ======================================================
// MY ORDERS
// ======================================================

async function loadMyOrders() {

  const container =
    byId(
      'myOrdersList'
    )

  if (!container) {
    return
  }


  if (!INIT_DATA) {

    container.innerHTML =
      `
        <div class="empty">
          Открой магазин через Telegram,
          чтобы увидеть свои заказы.
        </div>
      `

    return
  }


  container.innerHTML =
    `
      <div class="empty">
        Загружаем заказы...
      </div>
    `


  try {

    const result =
      await customerOrdersRequest({
        action:
          'my_orders'
      })


    const orders =
      Array.isArray(
        result.orders
      )
        ? result.orders
        : []


    renderMyOrders(
      orders
    )

  } catch (
    error
  ) {

    console.error(
      'My orders:',
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          ${escapeHtml(
            error instanceof Error
              ? error.message
              : 'Не удалось загрузить заказы'
          )}
        </div>
      `
  }
}


function renderMyOrders(
  orders
) {

  const container =
    byId(
      'myOrdersList'
    )

  if (!container) {
    return
  }


  if (
    !Array.isArray(
      orders
    ) ||
    !orders.length
  ) {

    container.innerHTML =
      `
        <div class="empty">
          У тебя пока нет заказов.
        </div>
      `

    return
  }


  container.innerHTML =
    orders
      .map(
        order => {

          const status =
            String(
              order.status ||
              'new'
            )


          const title =
            order.product_name ||
            order.name ||
            'Заказ'


          const size =
            order.size ||
            order.variant ||
            ''


          const canReview =
            [
              'completed',
              'done',
              'delivered'
            ].includes(
              status.toLowerCase()
            )


          const alreadyReviewed =
            Boolean(
              order.reviewed ||
              order.has_review
            )


          return `
            <div
              class="my-order-item"
              data-my-order="${order.id}"
            >

              <div class="my-order-top">

                <span class="my-order-number">
                  Заказ №${escapeHtml(
                    order.id
                  )}
                </span>

                <span class="my-order-date">
                  ${escapeHtml(
                    formatDate(
                      order.created_at
                    )
                  )}
                </span>

              </div>


              <strong class="my-order-title">
                ${escapeHtml(
                  title
                )}
              </strong>


              ${
                size
                  ? `
                    <div class="my-order-size">
                      Размер:
                      ${escapeHtml(
                        size
                      )}
                    </div>
                  `
                  : ''
              }


              <div class="my-order-status">

                <span class="order-status-dot"></span>

                <span>
                  ${escapeHtml(
                    getOrderStatusLabel(
                      status
                    )
                  )}
                </span>

              </div>


              ${
                canReview &&
                !alreadyReviewed
                  ? `
                    <div class="my-order-review">

                      <button
                        class="secondary-btn my-order-review-btn"
                        type="button"
                        data-review-order="${order.id}"
                      >
                        Оставить отзыв
                      </button>

                      <div
                        class="review-form hidden"
                        id="reviewForm${order.id}"
                      >

                        <select
                          class="review-rating-select"
                          id="reviewRating${order.id}"
                        >
                          <option value="5">
                            5 — Отлично
                          </option>

                          <option value="4">
                            4 — Хорошо
                          </option>

                          <option value="3">
                            3 — Нормально
                          </option>

                          <option value="2">
                            2 — Плохо
                          </option>

                          <option value="1">
                            1 — Очень плохо
                          </option>
                        </select>


                        <textarea
                          class="review-textarea"
                          id="reviewText${order.id}"
                          placeholder="Расскажи о покупке"
                        ></textarea>


                        <button
                          class="primary-btn"
                          type="button"
                          data-submit-review="${order.id}"
                          data-review-product="${
                            order.product_id ||
                            ''
                          }"
                        >
                          Отправить отзыв
                        </button>

                        <div
                          class="muted"
                          id="reviewStatus${order.id}"
                        ></div>

                      </div>

                    </div>
                  `
                  : ''
              }


              ${
                alreadyReviewed
                  ? `
                    <div
                      class="muted"
                      style="margin-top:10px"
                    >
                      Отзыв отправлен
                    </div>
                  `
                  : ''
              }

            </div>
          `
        }
      )
      .join('')


  container
    .querySelectorAll(
      '[data-review-order]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const id =
              button.dataset
                .reviewOrder


            byId(
              `reviewForm${id}`
            )?.classList.toggle(
              'hidden'
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-submit-review]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            submitReview(
              Number(
                button.dataset
                  .submitReview
              ),

              Number(
                button.dataset
                  .reviewProduct ||
                0
              ),

              button
            )
          }
        )
      }
    )
}


function getOrderStatusLabel(
  status
) {

  const normalized =
    String(
      status ||
      ''
    ).toLowerCase()


  const labels = {

    new:
      'Новый',

    pending:
      'На рассмотрении',

    accepted:
      'Принят',

    searching:
      'Ищем товар',

    purchased:
      'Товар выкуплен',

    shipping:
      'В пути',

    arrived:
      'Прибыл',

    ready:
      'Готов к выдаче',

    completed:
      'Завершён',

    delivered:
      'Получен',

    done:
      'Завершён',

    cancelled:
      'Отменён'
  }


  return (
    labels[
      normalized
    ] ||
    status ||
    'Новый'
  )
}


// ======================================================
// REVIEWS
// ======================================================

async function submitReview(
  orderId,
  productId,
  button
) {

  const rating =
    Number(
      byId(
        `reviewRating${orderId}`
      )?.value ||
      5
    )


  const reviewText =
    String(
      byId(
        `reviewText${orderId}`
      )?.value ||
      ''
    ).trim()


  const status =
    byId(
      `reviewStatus${orderId}`
    )


  if (
    rating < 1 ||
    rating > 5
  ) {

    setStatus(
      status,
      'Выбери оценку.',
      'error'
    )

    return
  }


  if (
    reviewText.length <
    3
  ) {

    setStatus(
      status,
      'Напиши несколько слов об заказе.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Отправляем...'
    }


    setStatus(
      status,
      ''
    )


    await callStoreFeatures(
      'create_review',
      {
        order_id:
          orderId,

        product_id:
          productId ||
          null,

        rating,

        review_text:
          reviewText
      }
    )


    productReviewsCache.clear()


    setStatus(
      status,
      'Спасибо! Отзыв отправлен на модерацию.',
      'success'
    )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    await sleep(
      800
    )


    loadMyOrders()

  } catch (
    error
  ) {

    console.error(
      'Review:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось отправить отзыв.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Отправить отзыв'
    }
  }
}


// ======================================================
// HOME REVIEWS
// ======================================================

async function loadHomeReviews() {

  const container =
    byId(
      'homeReviews'
    )


  if (!container) {
    return
  }


  try {

    const result =
      await callStoreFeatures(
        'public_reviews'
      )


    homeReviews =
      Array.isArray(
        result.reviews
      )
        ? result.reviews
        : []


    renderHomeReviews()

  } catch (
    error
  ) {

    console.error(
      'Home reviews:',
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          Отзывов пока нет
        </div>
      `
  }
}


function renderHomeReviews() {

  const container =
    byId(
      'homeReviews'
    )


  if (!container) {
    return
  }


  if (
    !homeReviews.length
  ) {

    container.innerHTML =
      `
        <div class="empty">
          Отзывов пока нет
        </div>
      `

    return
  }


  container.innerHTML =
    homeReviews
      .slice(
        0,
        6
      )
      .map(
        review => {

          const rating =
            Math.max(
              1,
              Math.min(
                5,
                Number(
                  review.rating ||
                  5
                )
              )
            )


          let username =
            String(
              review.telegram_username ||
              ''
            )
              .replace(
                /^@/,
                ''
              )
              .trim()


          if (!username) {
            username =
              'Покупатель'
          } else {
            username =
              `@${username}`
          }


          return `
            <div class="home-review-card">

              <div class="home-review-top">

                <div class="home-review-user">
                  ${escapeHtml(
                    username
                  )}
                </div>

                <div class="home-review-rating">
                  ${'★'.repeat(
                    rating
                  )}
                </div>

              </div>


              <div class="home-review-text">
                ${escapeHtml(
                  review.review_text ||
                  ''
                )}
              </div>

            </div>
          `
        }
      )
      .join('')
}


// ======================================================
// ACCOUNT
// ======================================================

async function loadAccount() {

  renderAccountUser()

  renderBrandSubscriptions()

  await Promise.allSettled([
    loadBrandSubscriptions(),
    loadReferralData()
  ])
}


function renderAccountUser() {

  const name =
    byId(
      'accountUserName'
    )

  const username =
    byId(
      'accountUsername'
    )


  if (name) {

    name.textContent =
      TELEGRAM_NAME ||
      'Покупатель'
  }


  if (username) {

    username.textContent =
      TELEGRAM_USERNAME ||
      (
        TELEGRAM_ID
          ? `ID ${TELEGRAM_ID}`
          : 'Открой через Telegram'
      )
  }
}


// ======================================================
// REFERRAL SYSTEM
// ======================================================

function getReferralLink() {

  if (!TELEGRAM_ID) {
    return ''
  }


  return (
    `https://t.me/${BOT_USERNAME}` +
    `?startapp=ref_${TELEGRAM_ID}`
  )
}


async function loadReferralData() {

  const linkElement =
    byId(
      'referralLink'
    )


  const invitedElement =
    byId(
      'referralInvitedCount'
    )


  const orderedElement =
    byId(
      'referralOrderedCount'
    )


  const bonusElement =
    byId(
      'referralBonusCount'
    )


  if (!TELEGRAM_ID) {

    if (linkElement) {

      linkElement.textContent =
        'Открой магазин через Telegram'
    }

    return
  }


  const link =
    getReferralLink()


  if (linkElement) {
    linkElement.textContent =
      link
  }


  try {

    const result =
      await callStoreFeatures(
        'referral_stats'
      )


    referralData =
      result


    const invited =
      Number(
        result.invited ||
        result.total ||
        0
      )


    const ordered =
      Number(
        result.ordered ||
        0
      )


    const bonus =
      Number(
        result.bonus ||
        result.bonus_amount ||
        0
      )


    if (invitedElement) {
      invitedElement.textContent =
        String(
          invited
        )
    }


    if (orderedElement) {
      orderedElement.textContent =
        String(
          ordered
        )
    }


    if (bonusElement) {
      bonusElement.textContent =
        formatPrice(
          bonus
        )
    }

  } catch (
    error
  ) {

    console.error(
      'Referral stats:',
      error
    )
  }
}


async function copyReferralLink() {

  const link =
    getReferralLink()


  if (!link) {

    alert(
      'Открой магазин через Telegram'
    )

    return
  }


  try {

    await navigator
      .clipboard
      .writeText(
        link
      )


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    const button =
      byId(
        'copyReferralBtn'
      )


    if (button) {

      const oldText =
        button.textContent


      button.textContent =
        'Скопировано'


      setTimeout(
        () => {
          button.textContent =
            oldText
        },
        1300
      )
    }

  } catch {

    prompt(
      'Скопируй ссылку:',
      link
    )
  }
}


function shareReferralLink() {

  const link =
    getReferralLink()


  if (!link) {

    alert(
      'Открой магазин через Telegram'
    )

    return
  }


  const text =
    'Посмотри актуальное наличие Kamka Store'


  if (
    tg?.openTelegramLink
  ) {

    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(
        link
      )}&text=${encodeURIComponent(
        text
      )}`
    )

    return
  }


  window.open(
    `https://t.me/share/url?url=${encodeURIComponent(
      link
    )}&text=${encodeURIComponent(
      text
    )}`,
    '_blank'
  )
}


function setupReferralEvents() {

  byId(
    'copyReferralBtn'
  )?.addEventListener(
    'click',
    copyReferralLink
  )


  byId(
    'shareReferralBtn'
  )?.addEventListener(
    'click',
    shareReferralLink
  )
}


// ======================================================
// PROCESS START PARAM
// ======================================================

async function processStartParam() {

  const startParam =
    String(
      tg
        ?.initDataUnsafe
        ?.start_param ||
      ''
    ).trim()


  if (!startParam) {
    return
  }


  // --------------------------------------
  // DIRECT PRODUCT LINK
  // product_123
  // --------------------------------------

  if (
    startParam.startsWith(
      'product_'
    )
  ) {

    const productId =
      Number(
        startParam.replace(
          'product_',
          ''
        )
      )


    if (productId) {

      showSection(
        'stock',
        {
          scroll:
            false
        }
      )


      await sleep(
        150
      )


      openProduct(
        productId
      )
    }


    return
  }


  // --------------------------------------
  // REFERRAL
  // ref_123456789
  // --------------------------------------

  if (
    startParam.startsWith(
      'ref_'
    )
  ) {

    const referrerId =
      Number(
        startParam.replace(
          'ref_',
          ''
        )
      )


    if (
      !referrerId ||
      !TELEGRAM_ID ||
      referrerId ===
        TELEGRAM_ID
    ) {
      return
    }


    try {

      await callStoreFeatures(
        'register_referral',
        {
          referrer_telegram_id:
            referrerId
        }
      )

    } catch (
      error
    ) {

      console.error(
        'Register referral:',
        error
      )
    }
  }
}


// ======================================================
// MY ORDERS REFRESH
// ======================================================

function setupMyOrdersEvents() {

  byId(
    'refreshMyOrdersBtn'
  )?.addEventListener(
    'click',
    loadMyOrders
  )
}


// ======================================================
// ACCOUNT OPEN BUTTONS
// ======================================================

function setupAccountEvents() {

  byId(
    'accountOpenOrdersBtn'
  )?.addEventListener(
    'click',
    () =>
      showSection(
        'orders'
      )
  )


  byId(
    'accountOpenFavoritesBtn'
  )?.addEventListener(
    'click',
    () => {

      showSection(
        'stock'
      )


      const favoriteProducts =
        products.filter(
          product =>
            favorites.has(
              Number(
                product.id
              )
            )
        )


      const grid =
        byId(
          'productGrid'
        )


      if (!grid) {
        return
      }


      if (
        !favoriteProducts.length
      ) {

        grid.innerHTML =
          `
            <div class="empty product-grid-empty">
              В избранном пока ничего нет
            </div>
          `

        return
      }


      grid.innerHTML =
        favoriteProducts
          .map(
            createProductCard
          )
          .join('')


      bindProductCardEvents(
        grid
      )
    }
  )
}


// ======================================================
// SYNC SERVER FAVORITES
// ======================================================

async function loadServerFavorites() {

  if (!INIT_DATA) {
    return
  }


  try {

    const result =
      await callStoreFeatures(
        'my_favorites'
      )


    const serverFavorites =
      Array.isArray(
        result.favorites
      )
        ? result.favorites
        : []


    serverFavorites
      .forEach(
        favorite => {

          const productId =
            Number(
              favorite.product_id ||
              favorite.id ||
              0
            )


          if (productId) {
            favorites.add(
              productId
            )
          }
        }
      )


    saveLocalFavorites()

    updateFavoritesCount()

    renderProducts()

  } catch (
    error
  ) {

    console.error(
      'Load favorites:',
      error
    )
  }
}
// ======================================================
// ADMIN ACCESS
// ======================================================

function setupAdminAccess() {

  const adminButton =
    byId(
      'adminSectionBtn'
    )


  if (!adminButton) {
    return
  }


  if (IS_ADMIN) {

    adminButton
      .classList
      .remove(
        'hidden'
      )

  } else {

    adminButton
      .classList
      .add(
        'hidden'
      )
  }
}


// ======================================================
// ADMIN DASHBOARD
// ======================================================

async function loadAdminDashboard() {

  if (!IS_ADMIN) {
    return
  }


  await Promise.allSettled([
    loadAdminProducts(),
    loadAdminOrders(),
    loadAdminStats(),
    loadAdminReviews(),
    loadAdminPromos(),
    loadAdminProductStats()
  ])
}


// ======================================================
// ADMIN TABS
// ======================================================

function setupAdminTabs() {

  $$('.admin-tab')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const tab =
              button.dataset
                .adminTab


            if (!tab) {
              return
            }


            $$('.admin-tab')
              .forEach(
                item =>
                  item
                    .classList
                    .remove(
                      'active'
                    )
              )


            button
              .classList
              .add(
                'active'
              )


            $$(
              '[data-admin-panel]'
            )
              .forEach(
                panel => {

                  panel
                    .classList
                    .toggle(
                      'hidden',
                      panel.dataset
                        .adminPanel !==
                        tab
                    )
                }
              )
          }
        )
      }
    )
}


// ======================================================
// ADMIN PRODUCTS
// ======================================================

async function loadAdminProducts() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'adminProductList'
    )


  if (container) {

    container.innerHTML =
      `
        <div class="empty">
          Загружаем товары...
        </div>
      `
  }


  try {

    const {
      data,
      error
    } =
      await supabase
        .from('products')
        .select(
          'id,brand,name,category,price,image_url,images,description,variants,active,created_at'
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )


    if (error) {
      throw error
    }


    adminProducts =
      (data || [])
        .map(
          normalizeProduct
        )


    renderAdminProducts()

  } catch (
    error
  ) {

    console.error(
      'Admin products:',
      error
    )


    if (container) {

      container.innerHTML =
        `
          <div class="empty">
            Не удалось загрузить товары
          </div>
        `
    }
  }
}


function getFilteredAdminProducts() {

  const search =
    String(
      byId(
        'adminProductSearch'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase()


  return adminProducts
    .filter(
      product => {

        if (
          adminProductMode ===
            'active' &&
          product.active ===
            false
        ) {
          return false
        }


        if (
          adminProductMode ===
            'inactive' &&
          product.active !==
            false
        ) {
          return false
        }


        if (!search) {
          return true
        }


        const haystack =
          [
            product.brand,
            product.name,
            product.category,
            product.id
          ]
            .filter(
              value =>
                value !==
                undefined
            )
            .join(' ')
            .toLowerCase()


        return haystack
          .includes(
            search
          )
      }
    )
}


function renderAdminProducts() {

  const container =
    byId(
      'adminProductList'
    )


  if (!container) {
    return
  }


  const result =
    getFilteredAdminProducts()


  const count =
    byId(
      'adminProductsCount'
    )


  if (count) {
    count.textContent =
      String(
        result.length
      )
  }


  if (!result.length) {

    container.innerHTML =
      `
        <div class="empty">
          Товары не найдены
        </div>
      `

    return
  }


  container.innerHTML =
    result
      .map(
        product => {

          const image =
            getProductImage(
              product
            )


          const stock =
            (
              product.variants ||
              []
            ).reduce(
              (
                total,
                variant
              ) =>
                total +
                Number(
                  variant.stock ||
                  0
                ),
              0
            )


          return `
            <div
              class="admin-product-row"
              data-admin-product-row="${product.id}"
            >

              <div class="admin-product-row-main">

                ${
                  image
                    ? `
                      <img
                        class="admin-product-thumb"
                        src="${escapeHtml(
                          image
                        )}"
                        alt=""
                      >
                    `
                    : `
                      <div
                        class="admin-product-thumb admin-product-thumb-empty"
                      >
                        —
                      </div>
                    `
                }


                <div class="admin-product-row-info">

                  <div class="brand">
                    ${escapeHtml(
                      product.brand
                    )}
                  </div>

                  <strong>
                    ${escapeHtml(
                      product.name
                    )}
                  </strong>

                  <div class="admin-row-price">
                    ${formatPrice(
                      product.price
                    )}
                  </div>

                  <div class="muted">
                    Остаток:
                    ${stock}
                  </div>

                </div>

              </div>


              <div class="admin-product-row-actions">

                <button
                  class="secondary-btn"
                  type="button"
                  data-admin-open-product="${product.id}"
                >
                  Открыть
                </button>


                <button
                  class="secondary-btn"
                  type="button"
                  data-admin-toggle-product="${product.id}"
                >
                  ${
                    product.active
                      ? 'Скрыть'
                      : 'Вернуть'
                  }
                </button>


                <button
                  class="danger-mini-btn"
                  type="button"
                  data-admin-delete-product="${product.id}"
                >
                  Удалить
                </button>

              </div>

            </div>
          `
        }
      )
      .join('')


  container
    .querySelectorAll(
      '[data-admin-open-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openProduct(
              Number(
                button.dataset
                  .adminOpenProduct
              )
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-admin-toggle-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            toggleAdminProduct(
              Number(
                button.dataset
                  .adminToggleProduct
              )
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-admin-delete-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            deleteAdminProduct(
              Number(
                button.dataset
                  .adminDeleteProduct
              )
            )
          }
        )
      }
    )
}


// ======================================================
// ADMIN PRODUCT FILTER EVENTS
// ======================================================

function setupAdminProductFilters() {

  byId(
    'adminProductSearch'
  )?.addEventListener(
    'input',
    renderAdminProducts
  )


  byId(
    'adminActiveProductsBtn'
  )?.addEventListener(
    'click',
    () => {

      adminProductMode =
        'active'


      updateAdminProductMode()

      renderAdminProducts()
    }
  )


  byId(
    'adminInactiveProductsBtn'
  )?.addEventListener(
    'click',
    () => {

      adminProductMode =
        'inactive'


      updateAdminProductMode()

      renderAdminProducts()
    }
  )
}


function updateAdminProductMode() {

  byId(
    'adminActiveProductsBtn'
  )?.classList.toggle(
    'active',
    adminProductMode ===
      'active'
  )


  byId(
    'adminInactiveProductsBtn'
  )?.classList.toggle(
    'active',
    adminProductMode ===
      'inactive'
  )
}


// ======================================================
// PRODUCT ADMIN ACTIONS INSIDE PRODUCT SHEET
// ======================================================

function renderProductAdminActions(
  product
) {

  return `
    <div class="admin-product-actions">

      <div>

        <div class="admin-actions-title">
          Управление товаром
        </div>

        <div class="muted admin-actions-subtitle">
          Видно только администратору
        </div>

      </div>


      <div class="admin-edit-product">

        <label>
          Бренд

          <input
            id="adminEditBrand"
            value="${escapeHtml(
              product.brand ||
              ''
            )}"
          >
        </label>


        <label>
          Название

          <input
            id="adminEditName"
            value="${escapeHtml(
              product.name ||
              ''
            )}"
          >
        </label>


        <label>
          Категория

          <input
            id="adminEditCategory"
            value="${escapeHtml(
              product.category ||
              ''
            )}"
          >
        </label>


        <label>
          Цена

          <input
            id="adminEditPrice"
            type="number"
            min="0"
            value="${Number(
              product.price ||
              0
            )}"
          >
        </label>


        <label>
          Описание

          <textarea
            id="adminEditDescription"
            rows="5"
          >${escapeHtml(
            product.description ||
            ''
          )}</textarea>
        </label>


        <button
          id="adminSaveProductBtn"
          class="primary-btn"
          type="button"
        >
          Сохранить изменения
        </button>

        <div
          id="adminEditProductStatus"
          class="muted"
        ></div>

      </div>


      <div>

        <div class="admin-actions-title">
          Остатки
        </div>

        <div
          class="admin-variant-actions"
          style="margin-top:10px"
        >

          ${
            (
              product.variants ||
              []
            ).length

              ? product.variants
                  .map(
                    (
                      variant,
                      index
                    ) =>
                      `
                        <button
                          class="secondary-btn admin-size-action"
                          type="button"
                          data-admin-stock-index="${index}"
                        >
                          ${escapeHtml(
                            variant.size
                          )}
                          — ${Number(
                            variant.stock ||
                            0
                          )} шт.
                        </button>
                      `
                  )
                  .join('')

              : `
                <div class="muted">
                  Размеры не указаны
                </div>
              `
          }

        </div>

      </div>


      <div class="admin-danger-row">

        <button
          id="adminToggleCurrentProductBtn"
          class="secondary-btn"
          type="button"
        >
          ${
            product.active
              ? 'Скрыть товар'
              : 'Вернуть товар'
          }
        </button>


        <button
          id="adminDeleteCurrentProductBtn"
          class="danger-btn"
          type="button"
        >
          Удалить товар
        </button>

      </div>

    </div>
  `
}


function setupProductAdminEvents(
  product
) {

  byId(
    'adminSaveProductBtn'
  )?.addEventListener(
    'click',
    () =>
      saveAdminProduct(
        product.id
      )
  )


  $$(
    '[data-admin-stock-index]'
  )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const index =
              Number(
                button.dataset
                  .adminStockIndex
              )


            changeProductStock(
              product,
              index
            )
          }
        )
      }
    )


  byId(
    'adminToggleCurrentProductBtn'
  )?.addEventListener(
    'click',
    () =>
      toggleAdminProduct(
        product.id
      )
  )


  byId(
    'adminDeleteCurrentProductBtn'
  )?.addEventListener(
    'click',
    () =>
      deleteAdminProduct(
        product.id
      )
  )
}


// ======================================================
// SAVE PRODUCT
// ======================================================

async function saveAdminProduct(
  productId
) {

  const status =
    byId(
      'adminEditProductStatus'
    )


  const brand =
    String(
      byId(
        'adminEditBrand'
      )?.value ||
      ''
    ).trim()


  const name =
    String(
      byId(
        'adminEditName'
      )?.value ||
      ''
    ).trim()


  const category =
    String(
      byId(
        'adminEditCategory'
      )?.value ||
      ''
    ).trim()


  const price =
    Number(
      byId(
        'adminEditPrice'
      )?.value ||
      0
    )


  const description =
    String(
      byId(
        'adminEditDescription'
      )?.value ||
      ''
    ).trim()


  if (
    !brand ||
    !name ||
    !price
  ) {

    setStatus(
      status,
      'Заполни бренд, название и цену.',
      'error'
    )

    return
  }


  try {

    setStatus(
      status,
      'Сохраняем...'
    )


    const {
      error
    } =
      await supabase
        .from('products')
        .update({
          brand,
          name,
          category,
          price,
          description
        })
        .eq(
          'id',
          Number(
            productId
          )
        )


    if (error) {
      throw error
    }


    setStatus(
      status,
      'Сохранено.',
      'success'
    )


    await refreshProductsAfterAdminChange(
      productId
    )

  } catch (
    error
  ) {

    console.error(
      error
    )


    setStatus(
      status,
      error?.message ||
      'Не удалось сохранить.',
      'error'
    )
  }
}


// ======================================================
// CHANGE STOCK
// ======================================================

async function changeProductStock(
  product,
  variantIndex
) {

  const variant =
    product
      .variants?.[
        variantIndex
      ]


  if (!variant) {
    return
  }


  const value =
    prompt(
      `Остаток для размера ${variant.size}:`,
      String(
        Number(
          variant.stock ||
          0
        )
      )
    )


  if (
    value ===
    null
  ) {
    return
  }


  const stock =
    Number(value)


  if (
    !Number.isInteger(
      stock
    ) ||
    stock < 0
  ) {

    alert(
      'Введи целое число от 0'
    )

    return
  }


  const variants =
    product.variants.map(
      (
        item,
        index
      ) => ({
        ...item,

        stock:
          index ===
          variantIndex
            ? stock
            : Number(
                item.stock ||
                0
              )
      })
    )


  try {

    const {
      error
    } =
      await supabase
        .from('products')
        .update({
          variants
        })
        .eq(
          'id',
          product.id
        )


    if (error) {
      throw error
    }


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    await refreshProductsAfterAdminChange(
      product.id
    )

  } catch (
    error
  ) {

    console.error(
      error
    )

    alert(
      error?.message ||
      'Не удалось изменить остаток'
    )
  }
}


// ======================================================
// HIDE / RESTORE PRODUCT
// ======================================================

async function toggleAdminProduct(
  productId
) {

  const product =
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    ) ||
    products.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (!product) {
    return
  }


  const newActive =
    !product.active


  const message =
    newActive
      ? 'Вернуть товар в каталог?'
      : 'Скрыть товар из каталога?'


  if (
    !confirm(
      message
    )
  ) {
    return
  }


  try {

    const {
      error
    } =
      await supabase
        .from('products')
        .update({
          active:
            newActive
        })
        .eq(
          'id',
          product.id
        )


    if (error) {
      throw error
    }


    closeSheets()


    await Promise.all([
      loadProducts(),
      loadAdminProducts()
    ])

  } catch (
    error
  ) {

    console.error(
      error
    )

    alert(
      error?.message ||
      'Не удалось изменить товар'
    )
  }
}


// ======================================================
// DELETE PRODUCT
// ======================================================

async function deleteAdminProduct(
  productId
) {

  const product =
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (!product) {
    return
  }


  const confirmed =
    confirm(
      `Удалить "${product.brand} ${product.name}"?`
    )


  if (!confirmed) {
    return
  }


  try {

    const {
      error
    } =
      await supabase
        .from('products')
        .delete()
        .eq(
          'id',
          product.id
        )


    if (error) {
      throw error
    }


    closeSheets()


    await Promise.all([
      loadProducts(),
      loadAdminProducts()
    ])


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      error
    )

    alert(
      error?.message ||
      'Не удалось удалить товар'
    )
  }
}


// ======================================================
// REFRESH PRODUCT AFTER ADMIN CHANGE
// ======================================================

async function refreshProductsAfterAdminChange(
  productId
) {

  await Promise.all([
    loadProducts(),
    loadAdminProducts()
  ])


  const updated =
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (updated) {

    currentProduct =
      updated

    selectedVariant =
      (
        updated.variants ||
        []
      ).find(
        variant =>
          Number(
            variant.stock
          ) > 0
      ) ||
      null


    await renderProductSheet()
  }
}


// ======================================================
// ADMIN ORDERS
// ======================================================

async function loadAdminOrders() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'adminOrdersList'
    )


  if (container) {

    container.innerHTML =
      `
        <div class="empty">
          Загружаем заказы...
        </div>
      `
  }


  try {

    const result =
      await customerOrdersRequest({
        action:
          'admin_list'
      })


    adminOrders =
      Array.isArray(
        result.orders
      )
        ? result.orders
        : []


    renderAdminOrders()

  } catch (
    error
  ) {

    console.error(
      'Admin orders:',
      error
    )


    if (container) {

      container.innerHTML =
        `
          <div class="empty">
            ${escapeHtml(
              error instanceof Error
                ? error.message
                : 'Не удалось загрузить заказы'
            )}
          </div>
        `
    }
  }
}


function isFinishedOrder(
  status
) {

  return [
    'completed',
    'delivered',
    'done',
    'cancelled'
  ].includes(
    String(
      status ||
      ''
    ).toLowerCase()
  )
}


function getAdminVisibleOrders() {

  return adminOrders
    .filter(
      order => {

        const finished =
          isFinishedOrder(
            order.status
          )


        if (
          adminOrderMode ===
          'active'
        ) {
          return !finished
        }


        return finished
      }
    )
}


function renderAdminOrders() {

  const container =
    byId(
      'adminOrdersList'
    )


  if (!container) {
    return
  }


  const orders =
    getAdminVisibleOrders()


  const activeCount =
    adminOrders.filter(
      order =>
        !isFinishedOrder(
          order.status
        )
    ).length


  const completedCount =
    adminOrders.filter(
      order =>
        isFinishedOrder(
          order.status
        )
    ).length


  const activeCountEl =
    byId(
      'adminActiveOrdersCount'
    )


  const completedCountEl =
    byId(
      'adminCompletedOrdersCount'
    )


  if (activeCountEl) {
    activeCountEl.textContent =
      String(
        activeCount
      )
  }


  if (completedCountEl) {
    completedCountEl.textContent =
      String(
        completedCount
      )
  }


  if (!orders.length) {

    container.innerHTML =
      `
        <div class="empty">
          Заказов здесь пока нет
        </div>
      `

    return
  }


  container.innerHTML =
    orders
      .map(
        order => {

          const contact =
            normalizeUsername(
              order.contact_telegram ||
              order.telegram ||
              order.telegram_username ||
              ''
            )


          return `
            <div class="admin-order-item">

              <div class="admin-order-top">

                <span class="admin-order-number">
                  Заказ №${escapeHtml(
                    order.id
                  )}
                </span>

                <span class="admin-order-date">
                  ${escapeHtml(
                    formatDate(
                      order.created_at
                    )
                  )}
                </span>

              </div>


              <strong class="admin-order-title">
                ${escapeHtml(
                  order.product_name ||
                  order.name ||
                  'Заказ'
                )}
              </strong>


              <div class="admin-order-meta">

                ${
                  order.size
                    ? `
                      <span>
                        Размер:
                        ${escapeHtml(
                          order.size
                        )}
                      </span>
                    `
                    : ''
                }


                ${
                  contact
                    ? `
                      <span>
                        Telegram:
                        ${escapeHtml(
                          contact
                        )}
                      </span>
                    `
                    : ''
                }


                <span>
                  Статус:
                  ${escapeHtml(
                    getOrderStatusLabel(
                      order.status
                    )
                  )}
                </span>

              </div>


              ${
                order.comment
                  ? `
                    <div class="admin-order-comment">
                      ${escapeHtml(
                        order.comment
                      )}
                    </div>
                  `
                  : ''
              }


              <div class="admin-order-actions">

                <select
                  class="admin-order-status-select"
                  data-order-status="${order.id}"
                >

                  ${renderOrderStatusOptions(
                    order.status
                  )}

                </select>


                ${
                  contact
                    ? `
                      <button
                        class="secondary-btn admin-order-contact-btn"
                        type="button"
                        data-contact-user="${escapeHtml(
                          contact
                        )}"
                      >
                        Написать клиенту
                      </button>
                    `
                    : ''
                }

              </div>

            </div>
          `
        }
      )
      .join('')


  container
    .querySelectorAll(
      '[data-order-status]'
    )
    .forEach(
      select => {

        select.addEventListener(
          'change',
          () => {

            updateOrderStatus(
              Number(
                select.dataset
                  .orderStatus
              ),
              select.value,
              select
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-contact-user]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const username =
              String(
                button.dataset
                  .contactUser ||
                ''
              ).replace(
                /^@/,
                ''
              )


            if (!username) {
              return
            }


            tg?.openTelegramLink(
              `https://t.me/${username}`
            )
          }
        )
      }
    )
}


function renderOrderStatusOptions(
  currentStatus
) {

  const statuses = [
    [
      'new',
      'Новый'
    ],

    [
      'accepted',
      'Принят'
    ],

    [
      'searching',
      'Ищем товар'
    ],

    [
      'purchased',
      'Товар выкуплен'
    ],

    [
      'shipping',
      'В пути'
    ],

    [
      'arrived',
      'Прибыл'
    ],

    [
      'ready',
      'Готов к выдаче'
    ],

    [
      'completed',
      'Завершён'
    ],

    [
      'cancelled',
      'Отменён'
    ]
  ]


  return statuses
    .map(
      ([
        value,
        label
      ]) =>
        `
          <option
            value="${value}"
            ${
              String(
                currentStatus
              ) ===
              value
                ? 'selected'
                : ''
            }
          >
            ${label}
          </option>
        `
    )
    .join('')
}


// ======================================================
// UPDATE ORDER STATUS
// ======================================================

async function updateOrderStatus(
  orderId,
  status,
  select
) {

  const oldValue =
    adminOrders.find(
      order =>
        Number(
          order.id
        ) ===
        Number(
          orderId
        )
    )?.status


  try {

    select.disabled =
      true


    await customerOrdersRequest({
      action:
        'admin_update_status',

      order_id:
        orderId,

      status
    })


    const order =
      adminOrders.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            orderId
          )
      )


    if (order) {
      order.status =
        status
    }


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )


    renderAdminOrders()

  } catch (
    error
  ) {

    console.error(
      'Update status:',
      error
    )


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить статус'
    )


    if (
      oldValue !==
      undefined
    ) {
      select.value =
        oldValue
    }

  } finally {

    select.disabled =
      false
  }
}


// ======================================================
// ADMIN ORDER TABS
// ======================================================

function setupAdminOrderTabs() {

  byId(
    'adminActiveOrdersBtn'
  )?.addEventListener(
    'click',
    () => {

      adminOrderMode =
        'active'

      updateAdminOrderTabs()

      renderAdminOrders()
    }
  )


  byId(
    'adminCompletedOrdersBtn'
  )?.addEventListener(
    'click',
    () => {

      adminOrderMode =
        'completed'

      updateAdminOrderTabs()

      renderAdminOrders()
    }
  )


  byId(
    'refreshAdminOrdersBtn'
  )?.addEventListener(
    'click',
    loadAdminOrders
  )
}


function updateAdminOrderTabs() {

  byId(
    'adminActiveOrdersBtn'
  )?.classList.toggle(
    'active',
    adminOrderMode ===
      'active'
  )


  byId(
    'adminCompletedOrdersBtn'
  )?.classList.toggle(
    'active',
    adminOrderMode ===
      'completed'
  )
}


// ======================================================
// ADMIN STATS
// ======================================================

async function loadAdminStats() {

  if (!IS_ADMIN) {
    return
  }


  try {

    const totalProducts =
      adminProducts.length


    const activeProducts =
      adminProducts.filter(
        product =>
          product.active
      ).length


    const totalOrders =
      adminOrders.length


    const activeOrders =
      adminOrders.filter(
        order =>
          !isFinishedOrder(
            order.status
          )
      ).length


    const productCount =
      byId(
        'statProducts'
      )

    const activeProductCount =
      byId(
        'statActiveProducts'
      )

    const orderCount =
      byId(
        'statOrders'
      )

    const activeOrderCount =
      byId(
        'statActiveOrders'
      )


    if (productCount) {
      productCount.textContent =
        String(
          totalProducts
        )
    }


    if (activeProductCount) {
      activeProductCount.textContent =
        String(
          activeProducts
        )
    }


    if (orderCount) {
      orderCount.textContent =
        String(
          totalOrders
        )
    }


    if (activeOrderCount) {
      activeOrderCount.textContent =
        String(
          activeOrders
        )
    }

  } catch (
    error
  ) {

    console.error(
      'Admin stats:',
      error
    )
  }
}


// ======================================================
// PRODUCT VIEW STATISTICS
// ======================================================

async function loadAdminProductStats() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'adminProductStatsList'
    )


  if (!container) {
    return
  }


  try {

    const result =
      await callStoreFeatures(
        'popular_products'
      )


    const stats =
      Array.isArray(
        result.products
      )
        ? result.products
            .map(
              normalizeProduct
            )
        : []


    if (!stats.length) {

      container.innerHTML =
        `
          <div class="empty">
            Просмотров пока нет
          </div>
        `

      return
    }


    container.innerHTML =
      stats
        .map(
          product => {

            const image =
              getProductImage(
                product
              )


            return `
              <div class="product-stat-row">

                <div class="product-stat-main">

                  ${
                    image
                      ? `
                        <img
                          class="product-stat-thumb"
                          src="${escapeHtml(
                            image
                          )}"
                          alt=""
                        >
                      `
                      : ''
                  }

                  <div class="product-stat-info">

                    <div class="product-stat-brand">
                      ${escapeHtml(
                        product.brand
                      )}
                    </div>

                    <div class="product-stat-name">
                      ${escapeHtml(
                        product.name
                      )}
                    </div>

                  </div>

                </div>


                <div class="product-stat-numbers">

                  <strong>
                    ${Number(
                      product.views ||
                      0
                    )}
                  </strong>

                  <span>
                    просмотров
                  </span>

                </div>

              </div>
            `
          }
        )
        .join('')

  } catch (
    error
  ) {

    console.error(
      'Product stats:',
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          Не удалось загрузить статистику
        </div>
      `
  }
}


// ======================================================
// ADMIN REVIEWS
// ======================================================

async function loadAdminReviews() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'adminReviewsList'
    )


  if (!container) {
    return
  }


  container.innerHTML =
    `
      <div class="empty">
        Загружаем отзывы...
      </div>
    `


  try {

    const result =
      await callStoreFeatures(
        'admin_reviews'
      )


    const reviews =
      Array.isArray(
        result.reviews
      )
        ? result.reviews
        : []


    renderAdminReviews(
      reviews
    )

  } catch (
    error
  ) {

    console.error(
      'Admin reviews:',
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          Не удалось загрузить отзывы
        </div>
      `
  }
}


function renderAdminReviews(
  reviews
) {

  const container =
    byId(
      'adminReviewsList'
    )


  if (!container) {
    return
  }


  if (!reviews.length) {

    container.innerHTML =
      `
        <div class="empty">
          Отзывов на модерации нет
        </div>
      `

    return
  }


  container.innerHTML =
    reviews
      .map(
        review =>
          `
            <div class="admin-review-item">

              <div class="admin-review-top">

                <span class="admin-review-rating">
                  ${'★'.repeat(
                    Math.max(
                      1,
                      Math.min(
                        5,
                        Number(
                          review.rating ||
                          5
                        )
                      )
                    )
                  )}
                </span>

                <span class="admin-review-date">
                  ${escapeHtml(
                    formatDate(
                      review.created_at
                    )
                  )}
                </span>

              </div>


              <div class="admin-review-user">
                ${
                  review.telegram_username
                    ? `@${escapeHtml(
                        String(
                          review.telegram_username
                        ).replace(
                          /^@/,
                          ''
                        )
                      )}`
                    : 'Покупатель'
                }
              </div>


              <div class="admin-review-text">
                ${escapeHtml(
                  review.review_text ||
                  ''
                )}
              </div>


              <div class="admin-review-actions">

                <button
                  class="primary-btn"
                  type="button"
                  data-approve-review="${review.id}"
                >
                  Опубликовать
                </button>


                <button
                  class="secondary-btn"
                  type="button"
                  data-reject-review="${review.id}"
                >
                  Отклонить
                </button>

              </div>

            </div>
          `
      )
      .join('')


  container
    .querySelectorAll(
      '[data-approve-review]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            moderateReview(
              Number(
                button.dataset
                  .approveReview
              ),
              true
            )
        )
      }
    )


  container
    .querySelectorAll(
      '[data-reject-review]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            moderateReview(
              Number(
                button.dataset
                  .rejectReview
              ),
              false
            )
        )
      }
    )
}


async function moderateReview(
  reviewId,
  approved
) {

  try {

    await callStoreFeatures(
      'admin_moderate_review',
      {
        review_id:
          reviewId,

        approved
      }
    )


    productReviewsCache.clear()


    await Promise.all([
      loadAdminReviews(),
      loadHomeReviews()
    ])


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      error
    )

    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить отзыв'
    )
  }
}


// ======================================================
// ADMIN PROMOCODES
// ======================================================

async function loadAdminPromos() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'promoCodesList'
    )


  if (!container) {
    return
  }


  container.innerHTML =
    `
      <div class="empty">
        Загружаем промокоды...
      </div>
    `


  try {

    const result =
      await callStoreFeatures(
        'admin_list_promos'
      )


    const promos =
      Array.isArray(
        result.promos
      )
        ? result.promos
        : []


    renderAdminPromos(
      promos
    )

  } catch (
    error
  ) {

    console.error(
      'Promos:',
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          Не удалось загрузить промокоды
        </div>
      `
  }
}


function renderAdminPromos(
  promos
) {

  const container =
    byId(
      'promoCodesList'
    )


  if (!container) {
    return
  }


  if (!promos.length) {

    container.innerHTML =
      `
        <div class="empty">
          Промокодов пока нет
        </div>
      `

    return
  }


  container.innerHTML =
    promos
      .map(
        promo => {

          const discount =
            promo.discount_type ===
            'percent'
              ? `${Number(
                  promo.discount_value
                )}%`
              : formatPrice(
                  promo.discount_value
                )


          return `
            <div class="promo-code-row">

              <div class="promo-code-top">

                <span class="promo-code-value">
                  ${escapeHtml(
                    promo.code
                  )}
                </span>

                <span class="promo-code-state">
                  ${
                    promo.active
                      ? 'Активен'
                      : 'Выключен'
                  }
                </span>

              </div>


              <div class="promo-code-meta">

                <span>
                  Скидка:
                  ${escapeHtml(
                    discount
                  )}
                </span>

                <span>
                  Использований:
                  ${Number(
                    promo.used_count ||
                    0
                  )}
                  ${
                    promo.max_uses
                      ? `/ ${Number(
                          promo.max_uses
                        )}`
                      : ''
                  }
                </span>

                ${
                  Number(
                    promo.min_order_amount ||
                    0
                  ) > 0
                    ? `
                      <span>
                        От суммы:
                        ${formatPrice(
                          promo.min_order_amount
                        )}
                      </span>
                    `
                    : ''
                }

              </div>


              <button
                class="secondary-btn full-width-btn"
                type="button"
                style="margin-top:10px"
                data-toggle-promo="${promo.id}"
                data-promo-active="${
                  promo.active
                    ? '1'
                    : '0'
                }"
              >
                ${
                  promo.active
                    ? 'Отключить'
                    : 'Включить'
                }
              </button>

            </div>
          `
      )
      .join('')


  container
    .querySelectorAll(
      '[data-toggle-promo]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            toggleAdminPromo(
              Number(
                button.dataset
                  .togglePromo
              ),
              button.dataset
                .promoActive !==
                '1'
            )
        )
      }
    )
}


// ======================================================
// CREATE PROMOCODE
// ======================================================

async function createAdminPromo() {

  const button =
    byId(
      'createPromoBtn'
    )

  const status =
    byId(
      'promoAdminStatus'
    )


  const code =
    String(
      byId(
        'promoCodeInput'
      )?.value ||
      ''
    )
      .trim()
      .toUpperCase()


  const discountType =
    String(
      byId(
        'promoDiscountType'
      )?.value ||
      'percent'
    )


  const discountValue =
    Number(
      byId(
        'promoDiscountValue'
      )?.value ||
      0
    )


  const minOrderAmount =
    Number(
      byId(
        'promoMinOrder'
      )?.value ||
      0
    )


  const maxUsesRaw =
    String(
      byId(
        'promoMaxUses'
      )?.value ||
      ''
    ).trim()


  const expiresRaw =
    String(
      byId(
        'promoExpiresAt'
      )?.value ||
      ''
    ).trim()


  if (
    !code ||
    discountValue <= 0
  ) {

    setStatus(
      status,
      'Заполни код и размер скидки.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Создаём...'
    }


    setStatus(
      status,
      ''
    )


    await callStoreFeatures(
      'admin_create_promo',
      {
        code,

        discount_type:
          discountType,

        discount_value:
          discountValue,

        min_order_amount:
          minOrderAmount,

        max_uses:
          maxUsesRaw
            ? Number(
                maxUsesRaw
              )
            : null,

        expires_at:
          expiresRaw
            ? new Date(
                expiresRaw
              ).toISOString()
            : null
      }
    )


    setStatus(
      status,
      `Промокод ${code} создан.`,
      'success'
    )


    ;[
      'promoCodeInput',
      'promoDiscountValue',
      'promoMinOrder',
      'promoMaxUses',
      'promoExpiresAt'
    ].forEach(
      id => {

        const input =
          byId(id)

        if (input) {
          input.value =
            ''
        }
      }
    )


    await loadAdminPromos()

  } catch (
    error
  ) {

    console.error(
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось создать промокод.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Создать промокод'
    }
  }
}


async function toggleAdminPromo(
  promoId,
  active
) {

  try {

    await callStoreFeatures(
      'admin_toggle_promo',
      {
        promo_id:
          promoId,

        active
      }
    )


    await loadAdminPromos()

  } catch (
    error
  ) {

    console.error(
      error
    )

    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить промокод'
    )
  }
}


function setupAdminPromoEvents() {

  byId(
    'createPromoBtn'
  )?.addEventListener(
    'click',
    createAdminPromo
  )
}


// ======================================================
// PUBLISH POST TO TELEGRAM CHANNEL
// ======================================================

function setupChannelPostEvents() {

  byId(
    'publishChannelPostBtn'
  )?.addEventListener(
    'click',
    publishChannelPost
  )
}


async function publishChannelPost() {

  const button =
    byId(
      'publishChannelPostBtn'
    )

  const status =
    byId(
      'channelPostStatus'
    )


  const textarea =
    byId(
      'channelPostText'
    )


  const checkbox =
    byId(
      'channelPostWithButton'
    )


  const text =
    String(
      textarea?.value ||
      ''
    ).trim()


  const withButton =
    checkbox
      ? checkbox.checked
      : true


  if (!text) {

    setStatus(
      status,
      'Напиши текст поста.',
      'error'
    )

    return
  }


  if (!IS_ADMIN) {

    setStatus(
      status,
      'Нет доступа.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Публикуем...'
    }


    setStatus(
      status,
      ''
    )


    await callChannelPost(
      text,
      withButton
    )


    setStatus(
      status,
      'Пост опубликован в канале.',
      'success'
    )


    if (textarea) {
      textarea.value =
        ''
    }


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      'Channel post:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось опубликовать пост.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Опубликовать'
    }
  }
}
// ======================================================
// ADMIN — CORRECT CURRENT HTML IDS
// ======================================================

function updateAdminProductCounts() {

  const active =
    adminProducts.filter(
      product =>
        product.active !== false
    ).length


  const hidden =
    adminProducts.filter(
      product =>
        product.active === false
    ).length


  if (
    byId(
      'adminActiveCount'
    )
  ) {
    byId(
      'adminActiveCount'
    ).textContent =
      String(active)
  }


  if (
    byId(
      'adminHiddenCount'
    )
  ) {
    byId(
      'adminHiddenCount'
    ).textContent =
      String(hidden)
  }
}


// ======================================================
// OVERRIDE ADMIN PRODUCT FILTERS
// ======================================================

function getFilteredAdminProducts() {

  const search =
    String(
      byId(
        'adminProductSearch'
      )?.value ||
      ''
    )
      .trim()
      .toLowerCase()


  return adminProducts.filter(
    product => {

      const modeOk =
        adminProductMode ===
        'active'
          ? product.active !==
            false
          : product.active ===
            false


      if (!modeOk) {
        return false
      }


      if (!search) {
        return true
      }


      const haystack =
        [
          product.brand,
          product.name,
          product.category,
          product.id
        ]
          .filter(
            value =>
              value !==
              undefined
          )
          .join(' ')
          .toLowerCase()


      return haystack.includes(
        search
      )
    }
  )
}


function renderAdminProducts() {

  const container =
    byId(
      'adminProductList'
    )


  if (!container) {
    return
  }


  updateAdminProductCounts()


  const result =
    getFilteredAdminProducts()


  if (!result.length) {

    container.innerHTML =
      `
        <div class="empty">
          ${
            adminProductMode ===
            'active'
              ? 'Активных товаров нет'
              : 'Скрытых товаров нет'
          }
        </div>
      `

    return
  }


  container.innerHTML =
    result
      .map(
        product => {

          const image =
            getProductImage(
              product
            )


          const activeSizes =
            getAvailableSizes(
              product
            )


          return `
            <div class="admin-product-row">

              <div class="admin-product-row-main">

                ${
                  image
                    ? `
                      <img
                        class="admin-product-thumb"
                        src="${escapeHtml(
                          image
                        )}"
                        alt="${escapeHtml(
                          product.name
                        )}"
                      >
                    `
                    : `
                      <div class="admin-product-thumb admin-product-thumb-empty">
                        —
                      </div>
                    `
                }


                <div class="admin-product-row-info">

                  <div class="brand">
                    ${escapeHtml(
                      product.brand
                    )}
                  </div>

                  <strong>
                    ${escapeHtml(
                      product.name
                    )}
                  </strong>

                  <div class="admin-row-price">
                    ${formatPrice(
                      product.price
                    )}
                  </div>

                  <div class="muted">

                    ${
                      productHasStock(
                        product
                      )
                        ? (
                            activeSizes.length
                              ? activeSizes
                                  .map(
                                    escapeHtml
                                  )
                                  .join(', ')
                              : 'В наличии'
                          )
                        : 'Продано'
                    }

                  </div>

                </div>

              </div>


              <div class="admin-product-row-actions">

                <button
                  class="secondary-btn"
                  type="button"
                  data-admin-open-product="${product.id}"
                >
                  Редактировать
                </button>


                <button
                  class="secondary-btn"
                  type="button"
                  data-admin-toggle-product="${product.id}"
                >
                  ${
                    product.active !==
                    false
                      ? 'Скрыть'
                      : 'Вернуть'
                  }
                </button>


                <button
                  class="danger-mini-btn"
                  type="button"
                  data-admin-delete-product="${product.id}"
                >
                  Удалить
                </button>

              </div>

            </div>
          `
        }
      )
      .join('')


  container
    .querySelectorAll(
      '[data-admin-open-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openProduct(
              Number(
                button.dataset
                  .adminOpenProduct
              )
            )
          }
        )
      }
    )


  container
    .querySelectorAll(
      '[data-admin-toggle-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            toggleAdminProduct(
              Number(
                button.dataset
                  .adminToggleProduct
              )
            )
        )
      }
    )


  container
    .querySelectorAll(
      '[data-admin-delete-product]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            deleteAdminProduct(
              Number(
                button.dataset
                  .adminDeleteProduct
              )
            )
        )
      }
    )
}


function setupAdminProductFilters() {

  byId(
    'adminProductSearch'
  )?.addEventListener(
    'input',
    renderAdminProducts
  )


  byId(
    'adminActiveTab'
  )?.addEventListener(
    'click',
    () => {

      adminProductMode =
        'active'


      byId(
        'adminActiveTab'
      )?.classList.add(
        'active'
      )


      byId(
        'adminHiddenTab'
      )?.classList.remove(
        'active'
      )


      renderAdminProducts()
    }
  )


  byId(
    'adminHiddenTab'
  )?.addEventListener(
    'click',
    () => {

      adminProductMode =
        'hidden'


      byId(
        'adminHiddenTab'
      )?.classList.add(
        'active'
      )


      byId(
        'adminActiveTab'
      )?.classList.remove(
        'active'
      )


      renderAdminProducts()
    }
  )


  byId(
    'refreshAdminProductsBtn'
  )?.addEventListener(
    'click',
    loadAdminProducts
  )
}


// ======================================================
// ADMIN PRODUCT ACTIONS THROUGH EDGE FUNCTION
// ======================================================

async function saveAdminProduct(
  productId
) {

  const status =
    byId(
      'adminEditProductStatus'
    )


  const button =
    byId(
      'adminSaveProductBtn'
    )


  const brand =
    String(
      byId(
        'adminEditBrand'
      )?.value ||
      ''
    ).trim()


  const name =
    String(
      byId(
        'adminEditName'
      )?.value ||
      ''
    ).trim()


  const category =
    String(
      byId(
        'adminEditCategory'
      )?.value ||
      ''
    ).trim()


  const price =
    Number(
      byId(
        'adminEditPrice'
      )?.value ||
      0
    )


  const description =
    String(
      byId(
        'adminEditDescription'
      )?.value ||
      ''
    ).trim()


  if (
    !brand ||
    !name ||
    !category ||
    price <= 0
  ) {

    setStatus(
      status,
      'Заполни бренд, название, категорию и цену.',
      'error'
    )

    return
  }


  try {

    if (button) {
      button.disabled =
        true

      button.textContent =
        'Сохраняем...'
    }


    setStatus(
      status,
      ''
    )


    const formData =
      new FormData()


    formData.append(
      'action',
      'edit'
    )

    formData.append(
      'product_id',
      String(
        productId
      )
    )

    formData.append(
      'brand',
      brand
    )

    formData.append(
      'name',
      name
    )

    formData.append(
      'category',
      category
    )

    formData.append(
      'price',
      String(
        price
      )
    )

    formData.append(
      'description',
      description
    )


    const result =
      await callAdminProduct(
        formData
      )


    const updated =
      normalizeProduct(
        result.product
      )


    const publicIndex =
      products.findIndex(
        item =>
          Number(
            item.id
          ) ===
          Number(
            productId
          )
      )


    if (
      publicIndex !==
      -1
    ) {
      products[
        publicIndex
      ] =
        updated
    }


    const adminIndex =
      adminProducts
        .findIndex(
          item =>
            Number(
              item.id
            ) ===
            Number(
              productId
            )
        )


    if (
      adminIndex !==
      -1
    ) {
      adminProducts[
        adminIndex
      ] =
        updated
    }


    currentProduct =
      updated


    setStatus(
      status,
      result.price_dropped
        ? `Сохранено. Уведомлений о снижении цены: ${Number(
            result.price_notifications ||
            0
          )}.`
        : 'Изменения сохранены.',
      'success'
    )


    populateFilters()

    renderProducts()

    renderHomeNewProducts()

    renderHomeBrands()

    renderAdminProducts()


    await renderProductSheet()

  } catch (
    error
  ) {

    console.error(
      'Save product:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось сохранить.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Сохранить изменения'
    }
  }
}


// ======================================================
// STOCK VIA ADMIN-PRODUCT
// ======================================================

async function changeProductStock(
  product,
  variantIndex
) {

  const variant =
    product
      .variants?.[
        variantIndex
      ]


  if (!variant) {
    return
  }


  const currentStock =
    Number(
      variant.stock ||
      0
    )


  const desired =
    prompt(
      `Размер ${variant.size}. Новый остаток:`,
      String(
        currentStock
      )
    )


  if (
    desired ===
    null
  ) {
    return
  }


  const stock =
    Number(
      desired
    )


  if (
    !Number.isInteger(
      stock
    ) ||
    stock < 0
  ) {

    alert(
      'Укажи целое число от 0.'
    )

    return
  }


  // Текущая Edge Function умеет soldout/restore.
  // Для 0 используем soldout.
  // Для значения > 0 используем restore.

  try {

    const formData =
      new FormData()


    formData.append(
      'action',
      stock > 0
        ? 'restore'
        : 'soldout'
    )


    formData.append(
      'product_id',
      String(
        product.id
      )
    )


    formData.append(
      'variant',
      String(
        variant.size
      )
    )


    const result =
      await callAdminProduct(
        formData
      )


    if (
      Array.isArray(
        result.variants
      )
    ) {

      product.variants =
        result.variants.map(
          normalizeVariant
        )
    }


    // restore в текущей Edge Function
    // возвращает остаток 1.
    // Поэтому пока поддерживаем 0/1.


    currentProduct =
      product


    renderProducts()

    renderAdminProducts()

    await renderProductSheet()


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      error
    )


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить остаток.'
    )
  }
}


// ======================================================
// HIDE / SHOW THROUGH ADMIN FUNCTION
// ======================================================

async function toggleAdminProduct(
  productId
) {

  const product =
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    ) ||
    products.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (!product) {
    return
  }


  const isActive =
    product.active !==
    false


  if (
    !confirm(
      isActive
        ? 'Скрыть товар из каталога?'
        : 'Вернуть товар в каталог?'
    )
  ) {
    return
  }


  try {

    const formData =
      new FormData()


    formData.append(
      'action',
      isActive
        ? 'hide'
        : 'show'
    )


    formData.append(
      'product_id',
      String(
        product.id
      )
    )


    await callAdminProduct(
      formData
    )


    closeSheets()


    await Promise.all([
      loadProducts(),
      loadAdminProducts()
    ])

  } catch (
    error
  ) {

    console.error(
      error
    )


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить товар.'
    )
  }
}


// ======================================================
// DELETE THROUGH ADMIN FUNCTION
// ======================================================

async function deleteAdminProduct(
  productId
) {

  const product =
    adminProducts.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    ) ||
    products.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          productId
        )
    )


  if (!product) {
    return
  }


  if (
    !confirm(
      `Удалить «${product.brand} ${product.name}» навсегда?`
    )
  ) {
    return
  }


  try {

    const formData =
      new FormData()


    formData.append(
      'action',
      'delete'
    )


    formData.append(
      'product_id',
      String(
        product.id
      )
    )


    await callAdminProduct(
      formData
    )


    favorites.delete(
      Number(
        product.id
      )
    )


    saveLocalFavorites()

    updateFavoritesCount()

    closeSheets()


    await Promise.all([
      loadProducts(),
      loadAdminProducts()
    ])

  } catch (
    error
  ) {

    console.error(
      error
    )


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось удалить товар.'
    )
  }
}


// ======================================================
// ADD PRODUCT — VARIANTS
// ======================================================

function createVariantRow() {

  const row =
    document.createElement(
      'div'
    )


  row.className =
    'admin-variant-row'


  row.innerHTML =
    `
      <input
        class="adminVariantSize"
        type="text"
        placeholder="Размер, например M"
      >

      <input
        class="adminVariantStock"
        type="number"
        min="1"
        value="1"
        placeholder="Количество"
      >

      <button
        type="button"
        class="removeVariantBtn"
      >
        ×
      </button>
    `


  row
    .querySelector(
      '.removeVariantBtn'
    )
    ?.addEventListener(
      'click',
      () => {

        row.remove()
      }
    )


  return row
}


function setupAdminVariantEvents() {

  byId(
    'addVariantBtn'
  )?.addEventListener(
    'click',
    () => {

      const container =
        byId(
          'adminVariants'
        )


      if (!container) {
        return
      }


      container.appendChild(
        createVariantRow()
      )
    }
  )
}


// ======================================================
// COLLECT VARIANTS
// ======================================================

function collectAdminVariants() {

  const rows =
    [
      ...document
        .querySelectorAll(
          '#adminVariants .admin-variant-row'
        )
    ]


  return rows
    .map(
      row => {

        const size =
          String(
            row
              .querySelector(
                '.adminVariantSize'
              )
              ?.value ||
            ''
          ).trim()


        const stock =
          Number(
            row
              .querySelector(
                '.adminVariantStock'
              )
              ?.value ||
            0
          )


        return {
          size,
          stock
        }
      }
    )
    .filter(
      variant =>
        variant.size &&
        variant.stock >
        0
    )
}


// ======================================================
// ADMIN IMAGE PREVIEW
// ======================================================

function setupAdminImagePreview() {

  byId(
    'adminImages'
  )?.addEventListener(
    'change',
    event => {

      const preview =
        byId(
          'adminImagePreview'
        )


      if (!preview) {
        return
      }


      const files =
        [
          ...(
            event.target
              .files ||
            []
          )
        ]
          .slice(
            0,
            5
          )


      preview.innerHTML =
        ''


      files.forEach(
        file => {

          const image =
            document
              .createElement(
                'img'
              )


          image.src =
            URL.createObjectURL(
              file
            )


          image.alt =
            ''


          preview.appendChild(
            image
          )
        }
      )
    }
  )
}


// ======================================================
// CREATE PRODUCT
// ======================================================

async function createAdminProduct() {

  if (!IS_ADMIN) {
    return
  }


  const button =
    byId(
      'adminAddProductBtn'
    )


  const status =
    byId(
      'adminStatus'
    )


  const brand =
    String(
      byId(
        'adminBrand'
      )?.value ||
      ''
    ).trim()


  const name =
    String(
      byId(
        'adminName'
      )?.value ||
      ''
    ).trim()


  const category =
    String(
      byId(
        'adminCategory'
      )?.value ||
      ''
    ).trim()


  const price =
    Number(
      byId(
        'adminPrice'
      )?.value ||
      0
    )


  const description =
    String(
      byId(
        'adminDescription'
      )?.value ||
      ''
    ).trim()


  const variants =
    collectAdminVariants()


  const imageInput =
    byId(
      'adminImages'
    )


  const files =
    [
      ...(
        imageInput
          ?.files ||
        []
      )
    ]


  if (!brand) {

    setStatus(
      status,
      'Укажи бренд.',
      'error'
    )

    return
  }


  if (!name) {

    setStatus(
      status,
      'Укажи название.',
      'error'
    )

    return
  }


  if (!category) {

    setStatus(
      status,
      'Выбери категорию.',
      'error'
    )

    return
  }


  if (
    !price ||
    price <= 0
  ) {

    setStatus(
      status,
      'Укажи цену.',
      'error'
    )

    return
  }


  if (
    !variants.length
  ) {

    setStatus(
      status,
      'Добавь хотя бы один размер.',
      'error'
    )

    return
  }


  if (
    !files.length
  ) {

    setStatus(
      status,
      'Добавь хотя бы одну фотографию.',
      'error'
    )

    return
  }


  if (
    files.length > 5
  ) {

    setStatus(
      status,
      'Можно добавить максимум 5 фотографий.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Добавляем...'
    }


    setStatus(
      status,
      'Загружаем товар...'
    )


    const formData =
      new FormData()


    formData.append(
      'action',
      'create'
    )


    formData.append(
      'brand',
      brand
    )


    formData.append(
      'name',
      name
    )


    formData.append(
      'category',
      category
    )


    formData.append(
      'price',
      String(
        price
      )
    )


    formData.append(
      'description',
      description
    )


    formData.append(
      'variants',
      JSON.stringify(
        variants
      )
    )


    files.forEach(
      file => {

        formData.append(
          'images',
          file
        )
      }
    )


    const result =
      await callAdminProduct(
        formData
      )


    setStatus(
      status,
      `Товар добавлен. Уведомлено подписчиков бренда: ${Number(
        result.brand_subscribers_notified ||
        0
      )}.`,
      'success'
    )


    // Очищаем форму

    ;[
      'adminBrand',
      'adminName',
      'adminPrice',
      'adminDescription'
    ].forEach(
      id => {

        const input =
          byId(id)

        if (input) {
          input.value =
            ''
        }
      }
    )


    if (imageInput) {
      imageInput.value =
        ''
    }


    const preview =
      byId(
        'adminImagePreview'
      )


    if (preview) {
      preview.innerHTML =
        ''
    }


    const variantsContainer =
      byId(
        'adminVariants'
      )


    if (
      variantsContainer
    ) {

      variantsContainer.innerHTML =
        `
          <div class="admin-variant-row">

            <input
              class="adminVariantSize"
              type="text"
              placeholder="Размер, например M"
            >

            <input
              class="adminVariantStock"
              type="number"
              min="1"
              value="1"
              placeholder="Количество"
            >

          </div>
        `
    }


    await Promise.all([
      loadProducts(),
      loadAdminProducts(),
      loadPopularProducts()
    ])


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      'Create product:',
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось добавить товар.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Добавить товар'
    }
  }
}


function setupAdminCreateProduct() {

  byId(
    'adminAddProductBtn'
  )?.addEventListener(
    'click',
    createAdminProduct
  )
}


// ======================================================
// CORRECT ADMIN STATISTICS
// ======================================================

async function loadAdminStats() {

  if (!IS_ADMIN) {
    return
  }


  const status =
    byId(
      'statsStatus'
    )


  try {

    setStatus(
      status,
      'Загружаем статистику...'
    )


    const formData =
      new FormData()


    formData.append(
      'action',
      'stats'
    )


    const result =
      await callAdminProduct(
        formData
      )


    if (
      byId(
        'statsTodayUsers'
      )
    ) {

      byId(
        'statsTodayUsers'
      ).textContent =
        String(
          result.today
            ?.users ??
          0
        )
    }


    if (
      byId(
        'statsTodayVisits'
      )
    ) {

      byId(
        'statsTodayVisits'
      ).textContent =
        `${result.today?.visits ?? 0} открытий`
    }


    if (
      byId(
        'stats7Users'
      )
    ) {

      byId(
        'stats7Users'
      ).textContent =
        String(
          result.last_7_days
            ?.users ??
          0
        )
    }


    if (
      byId(
        'stats7Visits'
      )
    ) {

      byId(
        'stats7Visits'
      ).textContent =
        `${result.last_7_days?.visits ?? 0} открытий`
    }


    if (
      byId(
        'stats30Users'
      )
    ) {

      byId(
        'stats30Users'
      ).textContent =
        String(
          result.last_30_days
            ?.users ??
          0
        )
    }


    if (
      byId(
        'stats30Visits'
      )
    ) {

      byId(
        'stats30Visits'
      ).textContent =
        `${result.last_30_days?.visits ?? 0} открытий`
    }


    if (
      byId(
        'statsAllUsers'
      )
    ) {

      byId(
        'statsAllUsers'
      ).textContent =
        String(
          result.all_time
            ?.users ??
          0
        )
    }


    if (
      byId(
        'statsAllVisits'
      )
    ) {

      byId(
        'statsAllVisits'
      ).textContent =
        `${result.all_time?.visits ?? 0} открытий`
    }


    setStatus(
      status,
      ''
    )

  } catch (
    error
  ) {

    console.error(
      error
    )


    setStatus(
      status,
      'Не удалось загрузить статистику.',
      'error'
    )
  }
}


// ======================================================
// CORRECT PRODUCT VIEW STATS
// ======================================================

async function loadAdminProductStats() {

  if (!IS_ADMIN) {
    return
  }


  const container =
    byId(
      'adminProductStatsList'
    )


  const status =
    byId(
      'adminProductStatsStatus'
    )


  if (!container) {
    return
  }


  try {

    setStatus(
      status,
      'Загружаем...'
    )


    const result =
      await callStoreFeatures(
        'admin_product_stats'
      )


    const stats =
      Array.isArray(
        result.products
      )
        ? result.products
        : []


    if (!stats.length) {

      container.innerHTML =
        `
          <div class="empty">
            Просмотров пока нет
          </div>
        `

      setStatus(
        status,
        ''
      )

      return
    }


    container.innerHTML =
      stats
        .slice(
          0,
          30
        )
        .map(
          product => {

            const image =
              product.image_url ||
              ''


            return `
              <div class="product-stat-row">

                <div class="product-stat-main">

                  ${
                    image
                      ? `
                        <img
                          class="product-stat-thumb"
                          src="${escapeHtml(
                            image
                          )}"
                          alt=""
                        >
                      `
                      : ''
                  }


                  <div class="product-stat-info">

                    <div class="product-stat-brand">
                      ${escapeHtml(
                        product.brand
                      )}
                    </div>

                    <div class="product-stat-name">
                      ${escapeHtml(
                        product.name
                      )}
                    </div>

                  </div>

                </div>


                <div class="product-stat-numbers">

                  <strong>
                    ${Number(
                      product.views ||
                      0
                    )}
                  </strong>

                  <span>
                    ${Number(
                      product.unique_users ||
                      0
                    )} уник.
                  </span>

                </div>

              </div>
            `
          }
        )
        .join('')


    setStatus(
      status,
      ''
    )

  } catch (
    error
  ) {

    console.error(
      error
    )


    container.innerHTML =
      `
        <div class="empty">
          Не удалось загрузить статистику
        </div>
      `


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : '',
      'error'
    )
  }
}


// ======================================================
// PRODUCT STATS REFRESH
// ======================================================

function setupProductStatsEvents() {

  byId(
    'refreshProductStatsBtn'
  )?.addEventListener(
    'click',
    loadAdminProductStats
  )
}


// ======================================================
// CORRECT REVIEW MODERATION ACTIONS
// ======================================================

async function moderateReview(
  reviewId,
  approved
) {

  try {

    await callStoreFeatures(
      approved
        ? 'admin_review_approve'
        : 'admin_review_reject',
      {
        review_id:
          Number(
            reviewId
          )
      }
    )


    productReviewsCache.clear()


    await Promise.all([
      loadAdminReviews(),
      loadHomeReviews()
    ])


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      error
    )


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить отзыв.'
    )
  }
}


// ======================================================
// CORRECT ADMIN REVIEW REFRESH
// ======================================================

function setupAdminReviewEvents() {

  byId(
    'refreshAdminReviewsBtn'
  )?.addEventListener(
    'click',
    loadAdminReviews
  )
}


// ======================================================
// CORRECT PROMO HTML IDS
// ======================================================

async function createAdminPromo() {

  const button =
    byId(
      'createPromoBtn'
    )


  const status =
    byId(
      'promoAdminStatus'
    )


  const code =
    String(
      byId(
        'promoAdminCode'
      )?.value ||
      ''
    )
      .trim()
      .toUpperCase()


  const discountType =
    String(
      byId(
        'promoAdminType'
      )?.value ||
      'percent'
    )


  const discountValue =
    Number(
      byId(
        'promoAdminValue'
      )?.value ||
      0
    )


  const minOrderAmount =
    Number(
      byId(
        'promoAdminMinAmount'
      )?.value ||
      0
    )


  const maxUsesRaw =
    String(
      byId(
        'promoAdminMaxUses'
      )?.value ||
      ''
    ).trim()


  const expiresRaw =
    String(
      byId(
        'promoAdminExpires'
      )?.value ||
      ''
    ).trim()


  if (
    !code ||
    discountValue <= 0
  ) {

    setStatus(
      status,
      'Заполни код и размер скидки.',
      'error'
    )

    return
  }


  try {

    if (button) {

      button.disabled =
        true

      button.textContent =
        'Создаём...'
    }


    setStatus(
      status,
      ''
    )


    await callStoreFeatures(
      'admin_create_promo',
      {
        code,

        discount_type:
          discountType,

        discount_value:
          discountValue,

        min_order_amount:
          minOrderAmount,

        max_uses:
          maxUsesRaw
            ? Number(
                maxUsesRaw
              )
            : null,

        expires_at:
          expiresRaw
            ? new Date(
                expiresRaw
              ).toISOString()
            : null
      }
    )


    setStatus(
      status,
      `Промокод ${code} создан.`,
      'success'
    )


    if (
      byId(
        'promoAdminCode'
      )
    ) {
      byId(
        'promoAdminCode'
      ).value =
        ''
    }


    if (
      byId(
        'promoAdminValue'
      )
    ) {
      byId(
        'promoAdminValue'
      ).value =
        ''
    }


    if (
      byId(
        'promoAdminMaxUses'
      )
    ) {
      byId(
        'promoAdminMaxUses'
      ).value =
        ''
    }


    if (
      byId(
        'promoAdminExpires'
      )
    ) {
      byId(
        'promoAdminExpires'
      ).value =
        ''
    }


    await loadAdminPromos()

  } catch (
    error
  ) {

    console.error(
      error
    )


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : 'Не удалось создать промокод.',
      'error'
    )

  } finally {

    if (button) {

      button.disabled =
        false

      button.textContent =
        'Создать промокод'
    }
  }
}


function setupAdminPromoEvents() {

  byId(
    'createPromoBtn'
  )?.addEventListener(
    'click',
    createAdminPromo
  )


  byId(
    'refreshPromoCodesBtn'
  )?.addEventListener(
    'click',
    loadAdminPromos
  )
}


// ======================================================
// CORRECT ADMIN ORDER ACTION
// ======================================================

async function updateOrderStatus(
  orderId,
  status,
  select
) {

  const order =
    adminOrders.find(
      item =>
        Number(
          item.id
        ) ===
        Number(
          orderId
        )
    )


  const oldStatus =
    order?.status


  try {

    if (select) {
      select.disabled =
        true
    }


    const result =
      await customerOrdersRequest({
        action:
          'update_status',

        order_id:
          Number(
            orderId
          ),

        status
      })


    if (
      result.order &&
      order
    ) {

      Object.assign(
        order,
        result.order
      )

    } else if (
      order
    ) {

      order.status =
        status
    }


    renderAdminOrders()


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      )

  } catch (
    error
  ) {

    console.error(
      error
    )


    if (
      order &&
      oldStatus
    ) {
      order.status =
        oldStatus
    }


    if (
      select &&
      oldStatus
    ) {
      select.value =
        oldStatus
    }


    alert(
      error instanceof Error
        ? error.message
        : 'Не удалось изменить статус.'
    )

  } finally {

    if (select) {
      select.disabled =
        false
    }
  }
}


// ======================================================
// CORRECT ADMIN ORDER TABS IDS
// ======================================================

function setupAdminOrderTabs() {

  byId(
    'adminOrdersActiveTab'
  )?.addEventListener(
    'click',
    () => {

      adminOrderMode =
        'active'


      byId(
        'adminOrdersActiveTab'
      )?.classList.add(
        'active'
      )


      byId(
        'adminOrdersCompletedTab'
      )?.classList.remove(
        'active'
      )


      renderAdminOrders()
    }
  )


  byId(
    'adminOrdersCompletedTab'
  )?.addEventListener(
    'click',
    () => {

      adminOrderMode =
        'completed'


      byId(
        'adminOrdersCompletedTab'
      )?.classList.add(
        'active'
      )


      byId(
        'adminOrdersActiveTab'
      )?.classList.remove(
        'active'
      )


      renderAdminOrders()
    }
  )


  byId(
    'refreshAdminOrdersBtn'
  )?.addEventListener(
    'click',
    loadAdminOrders
  )
}


// ======================================================
// CORRECT REFERRAL SYSTEM
// ======================================================

async function loadReferralData() {

  const linkElement =
    byId(
      'referralLink'
    )


  const invitedElement =
    byId(
      'referralInvited'
    )


  const orderedElement =
    byId(
      'referralOrdered'
    )


  const rewardedElement =
    byId(
      'referralRewarded'
    )


  const status =
    byId(
      'referralStatus'
    )


  if (!INIT_DATA) {

    if (linkElement) {
      linkElement.textContent =
        'Открой магазин через Telegram'
    }

    return
  }


  try {

    setStatus(
      status,
      'Загружаем...'
    )


    const result =
      await callStoreFeatures(
        'get_referral'
      )


    referralData =
      result


    if (linkElement) {

      linkElement.textContent =
        result.link ||
        ''
    }


    if (invitedElement) {

      invitedElement.textContent =
        String(
          result.stats
            ?.invited ??
          0
        )
    }


    if (orderedElement) {

      orderedElement.textContent =
        String(
          result.stats
            ?.ordered ??
          0
        )
    }


    if (rewardedElement) {

      rewardedElement.textContent =
        String(
          result.stats
            ?.rewarded ??
          0
        )
    }


    setStatus(
      status,
      ''
    )

  } catch (
    error
  ) {

    console.error(
      error
    )


    if (linkElement) {

      linkElement.textContent =
        'Не удалось загрузить ссылку'
    }


    setStatus(
      status,
      error instanceof Error
        ? error.message
        : '',
      'error'
    )
  }
}


function getReferralLink() {

  return (
    referralData
      ?.link ||
    ''
  )
}


// ======================================================
// CORRECT REFERRAL START PARAM
// ======================================================

async function processStartParam() {

  const startParam =
    String(
      tg
        ?.initDataUnsafe
        ?.start_param ||
      ''
    ).trim()


  if (!startParam) {
    return
  }


  // product_123

  if (
    startParam.startsWith(
      'product_'
    )
  ) {

    const productId =
      Number(
        startParam.replace(
          'product_',
          ''
        )
      )


    if (productId) {

      showSection(
        'stock',
        {
          scroll:
            false
        }
      )


      setTimeout(
        () => {
          openProduct(
            productId
          )
        },
        150
      )
    }


    return
  }


  // stock

  if (
    startParam ===
    'stock'
  ) {

    showSection(
      'stock',
      {
        scroll:
          false
      }
    )

    return
  }


  // ref_CODE

  if (
    startParam.startsWith(
      'ref_'
    )
  ) {

    const code =
      startParam
        .slice(
          4
        )
        .trim()
        .toUpperCase()


    if (!code) {
      return
    }


    try {

      await callStoreFeatures(
        'register_referral',
        {
          code
        }
      )

    } catch (
      error
    ) {

      console.error(
        'Referral registration:',
        error
      )
    }
  }
}


// ======================================================
// ACCOUNT COPY / SHARE REFERRAL
// ======================================================

async function copyReferralLink() {

  const link =
    getReferralLink()


  if (!link) {

    alert(
      'Реферальная ссылка ещё не загружена.'
    )

    return
  }


  try {

    await navigator
      .clipboard
      .writeText(
        link
      )


    const button =
      byId(
        'copyReferralBtn'
      )


    if (button) {

      const original =
        button.textContent


      button.textContent =
        'Скопировано'


      setTimeout(
        () => {

          button.textContent =
            original
        },
        1200
      )
    }

  } catch {

    prompt(
      'Скопируй ссылку:',
      link
    )
  }
}


function shareReferralLink() {

  const link =
    getReferralLink()


  if (!link) {
    return
  }


  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(
      link
    )}&text=${encodeURIComponent(
      'KAMKA STORE — актуальное наличие брендовых вещей'
    )}`


  if (
    tg?.openTelegramLink
  ) {

    tg.openTelegramLink(
      shareUrl
    )

  } else {

    window.open(
      shareUrl,
      '_blank'
    )
  }
}


// ======================================================
// MY ORDERS REFRESH CORRECTION
// ======================================================

function setupMyOrdersEvents() {

  byId(
    'refreshMyOrders'
  )?.addEventListener(
    'click',
    loadMyOrders
  )
}


// ======================================================
// HOME REVIEWS LOAD
// ======================================================

async function loadInitialHomeData() {

  await Promise.allSettled([
    loadPopularProducts(),
    loadHomeReviews()
  ])
}


// ======================================================
// ADMIN DASHBOARD FINAL
// ======================================================

async function loadAdminDashboard() {

  if (!IS_ADMIN) {
    return
  }


  await Promise.allSettled([
    loadAdminProducts(),
    loadAdminOrders(),
    loadAdminStats(),
    loadAdminReviews(),
    loadAdminPromos(),
    loadAdminProductStats()
  ])
}


// ======================================================
// CHANNEL POST BUTTON FINAL TEXT
// ======================================================

function setupChannelPostEvents() {

  byId(
    'publishChannelPostBtn'
  )?.addEventListener(
    'click',
    publishChannelPost
  )
}


// ======================================================
// TRACK VISIT
// ======================================================

async function trackVisit() {

  if (!INIT_DATA) {
    return
  }


  try {

    await fetch(
      `${FUNCTIONS_URL}/track-visit`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        },

        body:
          JSON.stringify({
            init_data:
              INIT_DATA
          })
      }
    )

  } catch (
    error
  ) {

    console.error(
      'Visit:',
      error
    )
  }
}


// ======================================================
// STARTUP SECTION
// ======================================================

function getInitialSection() {

  const startParam =
    String(
      tg
        ?.initDataUnsafe
        ?.start_param ||
      ''
    )


  if (
    startParam ===
    'stock'
  ) {
    return 'stock'
  }


  if (
    startParam.startsWith(
      'product_'
    )
  ) {
    return 'stock'
  }


  return 'home'
}


// ======================================================
// BASIC CLOSE / ESCAPE
// ======================================================

function setupKeyboardEvents() {

  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key ===
        'Escape'
      ) {
        closeSheets()
      }
    }
  )
}


// ======================================================
// INIT APP
// ======================================================

async function initApp() {

  console.log(
    'KAMKA STORE START'
  )


  // -------------------------
  // LOCAL DATA
  // -------------------------

  loadLocalCart()

  loadLocalFavorites()


  updateCartCount()

  updateFavoritesCount()


  // -------------------------
  // TELEGRAM
  // -------------------------

  fillTelegramFields()

  setupAdminAccess()


  // -------------------------
  // EVENTS
  // -------------------------

  setupNavigation()

  setupFilters()

  setupFavoritesButton()

  setupCartEvents()

  setupPromoEvents()

  setupCheckoutEvents()

  setupPoizonEvents()

  setupCustomOrderEvents()

  setupCheaperEvents()

  setupReferralEvents()

  setupMyOrdersEvents()

  setupKeyboardEvents()


  // ADMIN EVENTS

  if (IS_ADMIN) {

    setupAdminProductFilters()

    setupAdminVariantEvents()

    setupAdminImagePreview()

    setupAdminCreateProduct()

    setupAdminOrderTabs()

    setupAdminPromoEvents()

    setupAdminReviewEvents()

    setupProductStatsEvents()

    setupChannelPostEvents()
  }


  // -------------------------
  // INITIAL SECTION
  // -------------------------

  showSection(
    getInitialSection(),
    {
      scroll:
        false
    }
  )


  // -------------------------
  // PRODUCTS
  // -------------------------

  await loadProducts()


  // -------------------------
  // NEW FEATURES
  // -------------------------

  await Promise.allSettled([
    loadBrandSubscriptions(),
    loadInitialHomeData(),
    trackVisit()
  ])


  // -------------------------
  // DEEP LINKS / REFERRAL
  // -------------------------

  await processStartParam()


  // -------------------------
  // POIZON INITIAL CALC
  // -------------------------

  calculatePoizon()


  console.log(
    'KAMKA STORE READY'
  )
}


// ======================================================
// START
// ======================================================

initApp()
  .catch(
    error => {

      console.error(
        'APP INIT ERROR:',
        error
      )
    }
  )
  
}
