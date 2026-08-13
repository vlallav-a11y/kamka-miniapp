import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const ADMIN_TELEGRAM_ID = 1023844365;
const currentTelegramId = Number(
  tg?.initDataUnsafe?.user?.id || 0
);

const isAdmin =
  currentTelegramId === ADMIN_TELEGRAM_ID;

const el = id =>
  document.getElementById(id);

const money = value =>
  new Intl.NumberFormat('ru-RU').format(
    Number(value || 0)
  ) + ' ₽';


let products = [];
let allAdminProducts = [];

let category = 'Все';
let selectedBrand = 'Все';
let selectedSize = 'Все';

let selectedProduct = null;
let selectedVariant = null;

let favoritesOnly = false;

const cart = [];

const FAVORITES_KEY =
  'kamka_favorites_v1';

let favoriteIds = new Set(
  JSON.parse(
    localStorage.getItem(FAVORITES_KEY) ||
    '[]'
  ).map(String)
);


if (isAdmin) {
  el('adminSectionBtn')
    ?.classList.remove('hidden');
}


// =========================
// ИЗБРАННОЕ
// =========================

function saveFavorites() {
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify([...favoriteIds])
  );

  updateFavoritesCount();
}


function updateFavoritesCount() {
  if (el('favoritesCount')) {
    el('favoritesCount').textContent =
      favoriteIds.size;
  }
}


function toggleFavorite(productId) {
  const id = String(productId);

  if (favoriteIds.has(id)) {
    favoriteIds.delete(id);
  } else {
    favoriteIds.add(id);
  }

  saveFavorites();
  renderProducts();
}


// =========================
// ТОВАРЫ
// =========================

function normalizeProduct(p) {
  return {
    id: p.id,

    brand:
      p.brand || '',

    name:
      p.name || '',

    category:
      p.category || 'Другое',

    price:
      Number(p.price || 0),

    image:
      p.image_url || '',

    image_url:
      p.image_url || '',

    images:
      Array.isArray(p.images)
        ? p.images
        : [],

    description:
      p.description || '',

    variants:
      Array.isArray(p.variants)
        ? p.variants
        : [],

    active:
      p.active !== false,

    created_at:
      p.created_at || null,

    icon: '□'
  };
}


async function tryLoadSupabaseProducts() {

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY
  ) {
    return;
  }

  try {

    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=id,brand,name,category,price,image_url,images,description,variants,active,created_at` +
      `&active=eq.true` +
      `&order=created_at.desc`;


    const res = await fetch(
      url,
      {
        headers: {
          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );


    if (!res.ok) {

      const text =
        await res.text();

      throw new Error(
        'Supabase load failed: ' +
        text
      );
    }


    const data =
      await res.json();


    products =
      Array.isArray(data)
        ? data.map(normalizeProduct)
        : [];


    renderCategories();
    renderFilters();
    renderProducts();

  } catch (err) {

    console.error(err);

  }
}


// =========================
// АДМИН — ЗАГРУЗКА ВСЕХ
// =========================

async function loadAdminProducts() {

  if (!isAdmin) return;


  const status =
    el('adminListStatus');


  if (status) {
    status.textContent =
      'Загружаем товары...';
  }


  try {

    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=id,brand,name,category,price,image_url,images,description,variants,active,created_at` +
      `&order=created_at.desc`;


    const res = await fetch(
      url,
      {
        headers: {

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`

        }
      }
    );


    if (!res.ok) {

      throw new Error(
        await res.text()
      );

    }


    const data =
      await res.json();


    allAdminProducts =
      Array.isArray(data)
        ? data.map(normalizeProduct)
        : [];


    if (status) {
      status.textContent = '';
    }


    renderAdminProductList();

  } catch (err) {

    console.error(err);

    if (status) {

      status.textContent =
        'Ошибка загрузки товаров';

    }

  }
}


// =========================
// КАТЕГОРИИ
// =========================

function renderCategories() {

  const wrap =
    el('categoryTabs');


  if (!wrap) return;


  const categories = [
    'Все',

    ...new Set(
      products
        .map(p => p.category)
        .filter(Boolean)
    )
  ];


  wrap.innerHTML = '';


  categories.forEach(c => {

    const button =
      document.createElement(
        'button'
      );


    button.type =
      'button';


    button.className =
      'tab' +
      (
        c === category
          ? ' active'
          : ''
      );


    button.textContent =
      c;


    button.addEventListener(
      'click',
      () => {

        category = c;

        renderCategories();
        renderProducts();

      }
    );


    wrap.appendChild(
      button
    );

  });

}


// =========================
// ФИЛЬТРЫ
// =========================

function productHasSize(
  product,
  size
) {

  if (size === 'Все') {
    return true;
  }


  return (
    product.variants || []
  ).some(v => {

    const name =
      String(
        v.size ||
        v.name ||
        ''
      );


    return (
      name === size &&
      Number(v.stock) > 0
    );

  });

}


function renderFilters() {

  const brandFilter =
    el('brandFilter');

  const sizeFilter =
    el('sizeFilter');


  if (brandFilter) {

    const brands = [
      ...new Set(
        products
          .map(p => p.brand)
          .filter(Boolean)
      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          'ru'
        )
    );


    brandFilter.innerHTML =
      `<option value="Все">
        Все бренды
      </option>` +

      brands.map(
        brand =>
          `<option value="${escapeHtml(brand)}">
            ${escapeHtml(brand)}
          </option>`
      ).join('');


    if (
      brands.includes(
        selectedBrand
      )
    ) {

      brandFilter.value =
        selectedBrand;

    } else {

      selectedBrand = 'Все';
      brandFilter.value = 'Все';

    }

  }


  if (sizeFilter) {

    const sizes = [
      ...new Set(

        products.flatMap(
          product =>

            (
              product.variants ||
              []
            )

            .filter(
              v =>
                Number(v.stock) > 0
            )

            .map(
              v =>
                String(
                  v.size ||
                  v.name ||
                  ''
                ).trim()
            )

            .filter(Boolean)

        )

      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          'ru',
          {
            numeric: true
          }
        )
    );


    sizeFilter.innerHTML =
      `<option value="Все">
        Все размеры
      </option>` +

      sizes.map(
        size =>
          `<option value="${escapeHtml(size)}">
            ${escapeHtml(size)}
          </option>`
      ).join('');


    if (
      sizes.includes(
        selectedSize
      )
    ) {

      sizeFilter.value =
        selectedSize;

    } else {

      selectedSize = 'Все';
      sizeFilter.value = 'Все';

    }

  }

}


// =========================
// ФИЛЬТРАЦИЯ
// =========================

function filteredProducts() {

  const q =
    el('searchInput')
      ?.value
      .trim()
      .toLowerCase() ||
    '';


  let list =
    products.filter(
      product => {

        const categoryOk =
          category === 'Все' ||
          product.category ===
            category;


        const brandOk =
          selectedBrand === 'Все' ||
          product.brand ===
            selectedBrand;


        const sizeOk =
          productHasSize(
            product,
            selectedSize
          );


        const searchOk =
          !q ||

          product.name
            .toLowerCase()
            .includes(q) ||

          product.brand
            .toLowerCase()
            .includes(q);


        const favoriteOk =
          !favoritesOnly ||

          favoriteIds.has(
            String(
              product.id
            )
          );


        return (
          categoryOk &&
          brandOk &&
          sizeOk &&
          searchOk &&
          favoriteOk
        );

      }
    );


  const sort =
    el('sortSelect')
      ?.value ||
    'newest';


  if (
    sort ===
    'priceAsc'
  ) {

    list.sort(
      (a, b) =>
        a.price -
        b.price
    );

  }


  if (
    sort ===
    'priceDesc'
  ) {

    list.sort(
      (a, b) =>
        b.price -
        a.price
    );

  }


  if (
    sort ===
    'newest'
  ) {

    list.sort(
      (a, b) => {

        const aDate =
          a.created_at
            ? new Date(
                a.created_at
              ).getTime()
            : 0;


        const bDate =
          b.created_at
            ? new Date(
                b.created_at
              ).getTime()
            : 0;


        return (
          bDate -
          aDate
        );

      }
    );

  }


  return list;

}



// =========================
// КАТАЛОГ
// =========================

function renderProducts() {

  const list =
    filteredProducts();


  const grid =
    el('productGrid');


  if (!grid) return;


  if (
    el('resultCount')
  ) {

    el(
      'resultCount'
    ).textContent =
      `${list.length} позиций`;

  }


  if (
    el('catalogTitle')
  ) {

    el(
      'catalogTitle'
    ).textContent =
      favoritesOnly
        ? 'Избранное'
        : 'В наличии';

  }


  grid.innerHTML = '';


  if (!list.length) {

    grid.innerHTML =
      `<div class="empty product-grid-empty">
        ${
          favoritesOnly
            ? 'В избранном пока ничего нет'
            : 'Товары не найдены'
        }
      </div>`;


    return;
  }


  list.forEach(
    product => {

      const card =
        document.createElement(
          'article'
        );


      card.className =
        'product-card';


      const visual =
        product.image

        ? `<img
             src="${escapeHtml(product.image)}"
             alt="${escapeHtml(product.name)}"
           >`

        : product.icon;


      const favoriteActive =
        favoriteIds.has(
          String(
            product.id
          )
        );


      card.innerHTML = `

        <div class="product-card-media">

          <button
            class="product-open-btn"
            type="button"
          >

            <div class="product-image">
              ${visual}
            </div>

          </button>


          <button
            class="favorite-btn ${
              favoriteActive
                ? 'active'
                : ''
            }"
            type="button"
          >

            ${
              favoriteActive
                ? '♥'
                : '♡'
            }

          </button>


          ${
            isNewProduct(
              product
            )

            ? `<div class="product-badge">
                 Новинка
               </div>`

            : ''
          }

        </div>


        <button
          class="product-info-btn"
          type="button"
        >

          <div class="brand">
            ${escapeHtml(product.brand)}
          </div>

          <div class="product-name">
            ${escapeHtml(product.name)}
          </div>

          <div class="price">
            ${money(product.price)}
          </div>

        </button>

      `;


      card
        .querySelector(
          '.product-open-btn'
        )
        ?.addEventListener(
          'click',
          () =>
            openProduct(
              product
            )
        );


      card
        .querySelector(
          '.product-info-btn'
        )
        ?.addEventListener(
          'click',
          () =>
            openProduct(
              product
            )
        );


      card
        .querySelector(
          '.favorite-btn'
        )
        ?.addEventListener(
          'click',
          event => {

            event.stopPropagation();

            toggleFavorite(
              product.id
            );

          }
        );


      grid.appendChild(
        card
      );

    }
  );

}


// =========================
// ОКНА
// =========================

function openBackdrop() {

  el(
    'sheetBackdrop'
  )
  ?.classList
  .remove(
    'hidden'
  );

}


function closeAll() {

  [
    'productSheet',
    'cartSheet',
    'checkoutSheet',
    'sheetBackdrop'
  ].forEach(
    id =>

      el(id)
        ?.classList
        .add(
          'hidden'
        )

  );

}


// =========================
// ОТКРЫТИЕ ТОВАРА
// =========================

function openProduct(
  product
) {

  selectedProduct =
    product;


  selectedVariant =
    (
      product.variants ||
      []
    )
    .find(
      v =>
        Number(v.stock) >
        0
    ) ||
    null;


  renderProductSheet();

  openBackdrop();


  el(
    'productSheet'
  )
  ?.classList
  .remove(
    'hidden'
  );

}


// =========================
// КАРТОЧКА ТОВАРА
// =========================

function renderProductSheet() {

  const product =
    selectedProduct;


  if (!product) {
    return;
  }


  const images =
    Array.isArray(
      product.images
    ) &&
    product.images.length

      ? product.images

      : (
          product.image
            ? [product.image]
            : []
        );


  const gallery =
    images.length

    ? `

      <div class="product-gallery">

        ${
          images.map(
            (
              src,
              index
            ) => `

              <img
                src="${escapeHtml(src)}"
                alt="${escapeHtml(product.name)}"
                class="gallery-image ${
                  index === 0
                    ? 'active'
                    : ''
                }"
                draggable="false"
              >

            `
          ).join('')
        }


        ${
          images.length > 1

          ? `

            <button
              class="gallery-prev"
              type="button"
            >
              ‹
            </button>


            <button
              class="gallery-next"
              type="button"
            >
              ›
            </button>


            <div class="gallery-counter">
              1 / ${images.length}
            </div>

          `

          : ''
        }

      </div>

    `

    : '';


  const favoriteActive =
    favoriteIds.has(
      String(
        product.id
      )
    );


  el(
    'productSheetContent'
  ).innerHTML = `

    ${gallery}


    <div class="product-sheet-title-row">

      <div>

        <div class="brand">
          ${escapeHtml(product.brand)}
        </div>

        <div class="detail-title">
          ${escapeHtml(product.name)}
        </div>

      </div>


      <button
        id="sheetFavoriteBtn"
        class="sheet-favorite-btn ${
          favoriteActive
            ? 'active'
            : ''
        }"
        type="button"
      >

        ${
          favoriteActive
            ? '♥'
            : '♡'
        }

      </button>

    </div>


    <div class="detail-price">
      ${money(product.price)}
    </div>


    ${
      product.description

      ? `

        <div class="product-description">

          ${
            escapeHtml(
              product.description
            )
            .replace(
              /\n/g,
              '<br>'
            )
          }

        </div>

      `

      : ''
    }


    <div class="muted">
      Выберите размер
    </div>


    <div
      id="variantList"
      class="variant-list"
    ></div>


    <div style="height:14px"></div>


    <button
      id="addToCartBtn"
      class="primary-btn"
      type="button"
      ${
        selectedVariant
          ? ''
          : 'disabled'
      }
    >

      ${
        selectedVariant
          ? 'Добавить в корзину'
          : 'Нет доступных размеров'
      }

    </button>


    ${
      isAdmin

      ? `

        <div class="admin-product-actions">

          <div class="admin-actions-title">
            Управление товаром
          </div>


          <div class="admin-edit-product">

            <label>

              Цена, ₽

              <input
                id="adminEditPrice"
                type="number"
                min="1"
                value="${product.price}"
              >

            </label>


            <label>

              Описание

              <textarea
                id="adminEditDescription"
                rows="4"
              >${escapeHtml(product.description || '')}</textarea>

            </label>


            <button
              id="adminSaveProductBtn"
              type="button"
              class="secondary-btn full-width-btn"
            >
              Сохранить цену и описание
            </button>

          </div>


          <div
            id="adminVariantActions"
            class="admin-variant-actions"
          ></div>


          <div class="admin-danger-row">

            <button
              id="hideProductBtn"
              type="button"
              class="secondary-btn full-width-btn"
            >
              Скрыть товар
            </button>


            <button
              id="deleteProductBtn"
              type="button"
              class="danger-btn"
            >
              Удалить объявление
            </button>

          </div>

        </div>

      `

      : ''
    }

  `;


  setupGallery(
    images
  );


  el(
    'sheetFavoriteBtn'
  )
  ?.addEventListener(
    'click',
    () => {

      toggleFavorite(
        product.id
      );

      renderProductSheet();

    }
  );


  const variantWrap =
    el('variantList');


  (
    product.variants ||
    []
  ).forEach(
    variant => {

      const button =
        document.createElement(
          'button'
        );


      const variantName =
        variant.size ||
        variant.name ||
        'Размер';


      const soldOut =
        Number(
          variant.stock
        ) <= 0;


      button.type =
        'button';


      button.className =
        'variant-btn' +

        (
          selectedVariant ===
          variant
            ? ' active'
            : ''
        ) +

        (
          soldOut
            ? ' sold-out'
            : ''
        );


      button.disabled =
        soldOut;


      button.textContent =
        variantName;


      button.addEventListener(
        'click',
        () => {

          selectedVariant =
            variant;

          renderProductSheet();

        }
      );


      variantWrap
        ?.appendChild(
          button
        );

    }
  );


  el(
    'addToCartBtn'
  )
  ?.addEventListener(
    'click',
    () => {

      if (
        !selectedVariant
      ) {
        return;
      }


      cart.push({

        productId:
          product.id,

        brand:
          product.brand,

        name:
          product.name,

        variant:
          selectedVariant.size ||
          selectedVariant.name,

        price:
          product.price,

        image:
          product.image ||
          ''

      });


      updateCartCount();


      tg
        ?.HapticFeedback
        ?.impactOccurred(
          'light'
        );


      closeAll();

    }
  );


  if (isAdmin) {

    renderAdminActionsInProductSheet(
      product
    );

  }

}


// =========================
// ГАЛЕРЕЯ + СВАЙП
// =========================

function setupGallery(
  images
) {

  if (
    images.length <= 1
  ) {
    return;
  }


  let currentImage =
    0;


  const gallery =
    document.querySelector(
      '.product-gallery'
    );


  const galleryImages = [
    ...document.querySelectorAll(
      '.gallery-image'
    )
  ];


  const counter =
    document.querySelector(
      '.gallery-counter'
    );


  function showImage(
    index
  ) {

    galleryImages[
      currentImage
    ]
    ?.classList
    .remove(
      'active'
    );


    currentImage =
      (
        index +
        galleryImages.length
      ) %
      galleryImages.length;


    galleryImages[
      currentImage
    ]
    ?.classList
    .add(
      'active'
    );


    if (counter) {

      counter.textContent =
        `${currentImage + 1} / ${galleryImages.length}`;

    }

  }


  document
    .querySelector(
      '.gallery-prev'
    )
    ?.addEventListener(
      'click',
      () =>
        showImage(
          currentImage - 1
        )
    );


  document
    .querySelector(
      '.gallery-next'
    )
    ?.addEventListener(
      'click',
      () =>
        showImage(
          currentImage + 1
        )
    );


  let touchStartX =
    0;

  let touchEndX =
    0;


  gallery
    ?.addEventListener(
      'touchstart',
      event => {

        touchStartX =
          event
            .changedTouches[0]
            ?.screenX ||
          0;

      },
      {
        passive: true
      }
    );


  gallery
    ?.addEventListener(
      'touchend',
      event => {

        touchEndX =
          event
            .changedTouches[0]
            ?.screenX ||
          0;


        const delta =
          touchEndX -
          touchStartX;


        if (
          Math.abs(delta) <
          45
        ) {
          return;
        }


        if (delta < 0) {

          showImage(
            currentImage + 1
          );

        }


        if (delta > 0) {

          showImage(
            currentImage - 1
          );

        }

      },
      {
        passive: true
      }
    );

}


// =========================
// EDGE FUNCTION
// =========================

async function adminAction(
  formData
) {

  const res =
    await fetch(

      `${SUPABASE_URL}/functions/v1/admin-product`,

      {
        method:
          'POST',

        body:
          formData
      }

    );


  let data =
    {};


  try {

    data =
      await res.json();

  } catch {

    data = {};

  }


  if (!res.ok) {

    throw new Error(
      data.error ||
      `Ошибка ${res.status}`
    );

  }


  return data;

}


function addAdminAuth(
  formData
) {

  formData.append(
    'init_data',
    tg?.initData ||
    ''
  );

}


// =========================
// АДМИН В КАРТОЧКЕ
// =========================

function renderAdminActionsInProductSheet(
  product
) {

  const adminWrap =
    el(
      'adminVariantActions'
    );


  if (adminWrap) {

    adminWrap.innerHTML =
      `<div class="muted admin-actions-subtitle">
        Размеры
      </div>`;


    (
      product.variants ||
      []
    ).forEach(
      variant => {

        const sizeName =
          variant.size ||
          variant.name ||
          'Размер';


        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';


        button.className =
          'secondary-btn admin-size-action';


        button.textContent =
          Number(
            variant.stock
          ) > 0

          ? `Снять размер ${sizeName}`

          : `Вернуть размер ${sizeName}`;


        button.addEventListener(
          'click',
          async () => {

            try {

              button.disabled =
                true;


              const formData =
                new FormData();


              addAdminAuth(
                formData
              );


              formData.append(

                'action',

                Number(
                  variant.stock
                ) > 0

                  ? 'soldout'

                  : 'restore'

              );


              formData.append(
                'product_id',
                String(
                  product.id
                )
              );


              formData.append(
                'variant',
                sizeName
              );


              const data =
                await adminAction(
                  formData
                );


              if (
                Array.isArray(
                  data.variants
                )
              ) {

                product.variants =
                  data.variants;

              } else {

                variant.stock =
                  Number(
                    variant.stock
                  ) > 0

                    ? 0

                    : 1;

              }


              selectedVariant =
                product.variants
                  .find(
                    item =>
                      Number(
                        item.stock
                      ) > 0
                  ) ||
                null;


              syncProductAcrossLists(
                product
              );


              renderProductSheet();
              renderProducts();
              renderAdminProductList();

            } catch (err) {

              alert(
                err.message
              );

              button.disabled =
                false;

            }

          }
        );


        adminWrap.appendChild(
          button
        );

      }
    );

  }


  // РЕДАКТИРОВАТЬ

  el(
    'adminSaveProductBtn'
  )
  ?.addEventListener(
    'click',
    async () => {

      const price =
        Number(
          el(
            'adminEditPrice'
          )?.value ||
          0
        );


      const description =
        el(
          'adminEditDescription'
        )?.value.trim() ||
        '';


      if (
        !price ||
        price <= 0
      ) {

        alert(
          'Укажите корректную цену'
        );

        return;
      }


      const button =
        el(
          'adminSaveProductBtn'
        );


      try {

        if (button) {
          button.disabled =
            true;
        }


        const formData =
          new FormData();


        addAdminAuth(
          formData
        );


        formData.append(
          'action',
          'edit'
        );


        formData.append(
          'product_id',
          String(
            product.id
          )
        );


        formData.append(
          'price',
          String(price)
        );


        formData.append(
          'description',
          description
        );


        const data =
          await adminAction(
            formData
          );


        product.price =
          Number(
            data.product?.price ??
            price
          );


        product.description =
          data.product
            ?.description ??
          description;


        syncProductAcrossLists(
          product
        );


        renderProductSheet();
        renderProducts();
        renderAdminProductList();


        alert(
          'Изменения сохранены'
        );

      } catch (err) {

        alert(
          err.message
        );


        if (button) {
          button.disabled =
            false;
        }

      }

    }
  );


  // СКРЫТЬ

  el(
    'hideProductBtn'
  )
  ?.addEventListener(
    'click',
    async () => {

      if (
        !confirm(
          'Скрыть товар из каталога?'
        )
      ) {
        return;
      }


      try {

        const formData =
          new FormData();


        addAdminAuth(
          formData
        );


        formData.append(
          'action',
          'hide'
        );


        formData.append(
          'product_id',
          String(
            product.id
          )
        );


        await adminAction(
          formData
        );


        products =
          products.filter(
            item =>
              String(
                item.id
              ) !==
              String(
                product.id
              )
          );


        const adminProduct =
          allAdminProducts.find(
            item =>
              String(
                item.id
              ) ===
              String(
                product.id
              )
          );


        if (adminProduct) {

          adminProduct.active =
            false;

        }


        closeAll();
        renderProducts();
        renderAdminProductList();

      } catch (err) {

        alert(
          err.message
        );

      }

    }
  );


  // УДАЛИТЬ

  el(
    'deleteProductBtn'
  )
  ?.addEventListener(
    'click',
    async () => {

      if (
        !confirm(
          'Удалить объявление?'
        )
      ) {
        return;
      }


      try {

        const formData =
          new FormData();


        addAdminAuth(
          formData
        );


        formData.append(
          'action',
          'delete'
        );


        formData.append(
          'product_id',
          String(
            product.id
          )
        );


        await adminAction(
          formData
        );


        products =
          products.filter(
            item =>
              String(
                item.id
              ) !==
              String(
                product.id
              )
          );


        allAdminProducts =
          allAdminProducts.filter(
            item =>
              String(
                item.id
              ) !==
              String(
                product.id
              )
          );


        favoriteIds.delete(
          String(
            product.id
          )
        );


        saveFavorites();


        closeAll();
        renderProducts();
        renderAdminProductList();

      } catch (err) {

        alert(
          err.message
        );

      }

    }
  );

}


// =========================
// СИНХРОНИЗАЦИЯ
// =========================

function syncProductAcrossLists(
  product
) {

  const publicIndex =
    products.findIndex(
      item =>
        String(
          item.id
        ) ===
        String(
          product.id
        )
    );


  if (
    publicIndex !== -1
  ) {

    products[
      publicIndex
    ] =
      product;

  }


  const adminIndex =
    allAdminProducts
      .findIndex(
        item =>
          String(
            item.id
          ) ===
          String(
            product.id
          )
      );


  if (
    adminIndex !== -1
  ) {

    allAdminProducts[
      adminIndex
    ] = {

      ...allAdminProducts[
        adminIndex
      ],

      ...product

    };

  }

}


// =========================
// КОРЗИНА
// =========================

function updateCartCount() {

  if (
    el('cartCount')
  ) {

    el(
      'cartCount'
    ).textContent =
      cart.length;

  }

}


function renderCart() {

  const wrap =
    el('cartItems');


  if (!wrap) return;


  wrap.innerHTML = '';


  if (!cart.length) {

    wrap.innerHTML =
      `<div class="empty">
        Корзина пока пустая
      </div>`;

  }


  cart.forEach(
    (
      item,
      index
    ) => {

      const row =
        document.createElement(
          'div'
        );


      row.className =
        'cart-item';


      row.innerHTML = `

        <div class="cart-item-main">

          ${
            item.image

            ? `<img
                 class="cart-thumb"
                 src="${escapeHtml(item.image)}"
                 alt="${escapeHtml(item.name)}"
               >`

            : ''
          }


          <div>

            <div class="brand">
              ${escapeHtml(item.brand)}
            </div>

            <strong>
              ${escapeHtml(item.name)}
            </strong>

            <div class="muted">
              Размер:
              ${escapeHtml(item.variant || '')}
            </div>

          </div>

        </div>


        <div class="cart-item-right">

          <div>
            ${money(item.price)}
          </div>

          <button
            class="secondary-btn"
            data-index="${index}"
            type="button"
          >
            Удалить
          </button>

        </div>

      `;


      wrap.appendChild(
        row
      );

    }
  );


  wrap
    .querySelectorAll(
      '[data-index]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            cart.splice(
              Number(
                button.dataset.index
              ),
              1
            );


            updateCartCount();
            renderCart();

          }
        );

      }
    );


  el(
    'cartTotal'
  ).textContent =
    money(
      cart.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.price,
        0
      )
    );


  el(
    'checkoutButton'
  ).disabled =
    !cart.length;

}


function openCart() {

  renderCart();

  openBackdrop();


  el(
    'cartSheet'
  )
  ?.classList
  .remove(
    'hidden'
  );

}


function openCheckout() {

  if (
    !cart.length
  ) {
    return;
  }


  el(
    'cartSheet'
  )
  ?.classList
  .add(
    'hidden'
  );


  el(
    'checkoutSheet'
  )
  ?.classList
  .remove(
    'hidden'
  );

}


// =========================
// СТАРАЯ ЛОГИКА ЗАКАЗА
// НЕ МЕНЯЕМ
// =========================

async function submitOrder(
  event
) {

  event.preventDefault();


  const telegram =
    el(
      'stockTelegram'
    )
    ?.value
    .trim() ||
    '';


  if (!telegram) {

    el(
      'checkoutStatus'
    ).textContent =
      'Укажите ваш Telegram';

    return;
  }


  const payload = {

    telegram_user: {

      username:
        telegram.replace(
          /^@/,
          ''
        )

    },


    telegram_init_data:
      tg?.initData ||
      '',


    customer: {

      telegram

    },


    items:
      cart,


    total:
      cart.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.price,
        0
      ),


    created_at:
      new Date()
        .toISOString()

  };


  el(
    'checkoutStatus'
  ).textContent =
    'Отправляем заявку...';


  try {

    const res =
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

      );


    if (!res.ok) {

      throw new Error(
        'Не удалось сохранить заказ'
      );

    }


    el(
      'checkoutStatus'
    ).textContent =
      'Заявка создана. Мы свяжемся с вами в Telegram.';


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'success'
      );


    cart.splice(0);


    updateCartCount();

  } catch (err) {

    console.error(
      err
    );


    el(
      'checkoutStatus'
    ).textContent =
      'Ошибка отправки. Попробуйте ещё раз.';


    tg
      ?.HapticFeedback
      ?.notificationOccurred(
        'error'
      );

  }

}


// =========================
// POIZON
// =========================

const POIZON_RATE =
  12.7;

const POIZON_COMMISSION =
  700;


function calculatePoizon() {

  const yuan =
    Number(
      el(
        'poizonPrice'
      )?.value
    ) ||
    0;


  const weight =
    Number(
      el(
        'poizonWeight'
      )?.value
    ) ||
    0;


  const deliveryRate =
    Number(
      el(
        'poizonDelivery'
      )?.value
    ) ||
    0;


  const productTotal =
    yuan *
    POIZON_RATE;


  const deliveryTotal =
    weight *
    deliveryRate;


  const finalTotal =
    productTotal +
    deliveryTotal +
    POIZON_COMMISSION;


  el(
    'poizonFinalTotal'
  ).textContent =
    money(
      Math.round(
        finalTotal
      )
    );

}


document
  .querySelectorAll(
    '.delivery-option'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          document
            .querySelectorAll(
              '.delivery-option'
            )
            .forEach(
              btn =>
                btn
                  .classList
                  .remove(
                    'active'
                  )
            );


          button
            .classList
            .add(
              'active'
            );


          el(
            'poizonDelivery'
          ).value =
            button.dataset.rate;


          calculatePoizon();

        }
      );

    }
  );


el(
  'poizonPrice'
)
?.addEventListener(
  'input',
  calculatePoizon
);


el(
  'poizonWeight'
)
?.addEventListener(
  'input',
  calculatePoizon
);


el(
  'poizonOrderButton'
)
?.addEventListener(
  'click',
  async () => {

    const yuan =
      Number(
        el(
          'poizonPrice'
        )?.value
      ) ||
      0;


    const weight =
      Number(
        el(
          'poizonWeight'
        )?.value
      ) ||
      0;


    const deliveryRate =
      Number(
        el(
          'poizonDelivery'
        )?.value
      ) ||
      0;


    const telegram =
      el(
        'poizonTelegram'
      )
      ?.value
      .trim() ||
      '';


    if (!telegram) {

      el(
        'poizonOrderStatus'
      ).textContent =
        'Укажите ваш Telegram';

      return;
    }


    if (
      !yuan ||
      !weight
    ) {

      el(
        'poizonOrderStatus'
      ).textContent =
        'Укажите стоимость товара и вес.';

      return;
    }


    const productTotal =
      yuan *
      POIZON_RATE;


    const deliveryTotal =
      weight *
      deliveryRate;


    const finalTotal =
      Math.round(

        productTotal +
        deliveryTotal +
        POIZON_COMMISSION

      );


    const deliveryName =
      deliveryRate ===
      2500

        ? 'Авиа'

        : 'Авто';


    const payload = {

      telegram,

      price_yuan:
        yuan,

      weight,

      delivery:
        deliveryName,

      total:
        finalTotal,

      created_at:
        new Date()
          .toISOString()

    };


    el(
      'poizonOrderStatus'
    ).textContent =
      'Отправляем...';


    try {

      const res =
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

        );


      if (!res.ok) {

        throw new Error(
          'Не удалось сохранить заказ'
        );

      }


      el(
        'poizonOrderStatus'
      ).textContent =
        'Заявка отправлена. Мы свяжемся с вами в Telegram.';


      tg
        ?.HapticFeedback
        ?.notificationOccurred(
          'success'
        );


      el(
        'poizonPrice'
      ).value =
        '';


      el(
        'poizonWeight'
      ).value =
        '';


      el(
        'poizonTelegram'
      ).value =
        '';


      el(
        'poizonDelivery'
      ).value =
        '850';


      document
        .querySelectorAll(
          '.delivery-option'
        )
        .forEach(
          btn =>
            btn
              .classList
              .remove(
                'active'
              )
        );


      document
        .querySelector(
          '.delivery-option[data-rate="850"]'
        )
        ?.classList
        .add(
          'active'
        );


      calculatePoizon();

    } catch (err) {

      console.error(
        err
      );


      el(
        'poizonOrderStatus'
      ).textContent =
        'Ошибка отправки. Попробуйте ещё раз.';


      tg
        ?.HapticFeedback
        ?.notificationOccurred(
          'error'
        );

    }

  }
);


// =========================
// ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
// =========================

const stockBtn =
  el(
    'stockSectionBtn'
  );

const poizonBtn =
  el(
    'poizonSectionBtn'
  );

const adminBtn =
  el(
    'adminSectionBtn'
  );

const stockSection =
  el(
    'stockSection'
  );

const poizonSection =
  el(
    'poizonSection'
  );

const adminSection =
  el(
    'adminSection'
  );


function showStockSection() {

  stockBtn
    ?.classList
    .add(
      'active'
    );


  poizonBtn
    ?.classList
    .remove(
      'active'
    );


  adminBtn
    ?.classList
    .remove(
      'active'
    );


  stockSection
    ?.classList
    .remove(
      'hidden'
    );


  poizonSection
    ?.classList
    .add(
      'hidden'
    );


  adminSection
    ?.classList
    .add(
      'hidden'
    );

}


function showPoizonSection() {

  poizonBtn
    ?.classList
    .add(
      'active'
    );


  stockBtn
    ?.classList
    .remove(
      'active'
    );


  adminBtn
    ?.classList
    .remove(
      'active'
    );


  stockSection
    ?.classList
    .add(
      'hidden'
    );


  poizonSection
    ?.classList
    .remove(
      'hidden'
    );


  adminSection
    ?.classList
    .add(
      'hidden'
    );

}


async function showAdminSection() {

  if (!isAdmin) {
    return;
  }


  adminBtn
    ?.classList
    .add(
      'active'
    );


  stockBtn
    ?.classList
    .remove(
      'active'
    );


  poizonBtn
    ?.classList
    .remove(
      'active'
    );


  stockSection
    ?.classList
    .add(
      'hidden'
    );


  poizonSection
    ?.classList
    .add(
      'hidden'
    );


  adminSection
    ?.classList
    .remove(
      'hidden'
    );


  await loadAdminProducts();

}


stockBtn
  ?.addEventListener(
    'click',
    showStockSection
  );


poizonBtn
  ?.addEventListener(
    'click',
    showPoizonSection
  );


adminBtn
  ?.addEventListener(
    'click',
    showAdminSection
  );


// =========================
// ФИЛЬТРЫ
// =========================

el(
  'searchInput'
)
?.addEventListener(
  'input',
  renderProducts
);


el(
  'sortSelect'
)
?.addEventListener(
  'change',
  renderProducts
);


el(
  'brandFilter'
)
?.addEventListener(
  'change',
  event => {

    selectedBrand =
      event.target.value;

    renderProducts();

  }
);


el(
  'sizeFilter'
)
?.addEventListener(
  'change',
  event => {

    selectedSize =
      event.target.value;

    renderProducts();

  }
);


el(
  'favoritesButton'
)
?.addEventListener(
  'click',
  () => {

    favoritesOnly =
      !favoritesOnly;


    el(
      'favoritesButton'
    )
    ?.classList
    .toggle(
      'active',
      favoritesOnly
    );


    showStockSection();
    renderProducts();

  }
);


// =========================
// АДМИН — РАЗМЕРЫ
// =========================

function resetAdminVariants() {

  const wrap =
    el(
      'adminVariants'
    );


  if (!wrap) return;


  wrap.innerHTML = `

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

  `;

}


el(
  'addVariantBtn'
)
?.addEventListener(
  'click',
  () => {

    const row =
      document.createElement(
        'div'
      );


    row.className =
      'admin-variant-row';


    row.innerHTML = `

      <input
        class="adminVariantSize"
        type="text"
        placeholder="Размер, например L"
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

    `;


    row
      .querySelector(
        '.removeVariantBtn'
      )
      ?.addEventListener(
        'click',
        () =>
          row.remove()
      );


    el(
      'adminVariants'
    )
    ?.appendChild(
      row
    );

  }
);


// =========================
// ПРЕВЬЮ ФОТО
// =========================

el(
  'adminImages'
)
?.addEventListener(
  'change',
  () => {

    const files = [
      ...(
        el(
          'adminImages'
        )?.files ||
        []
      )
    ];


    const preview =
      el(
        'adminImagePreview'
      );


    if (!preview) return;


    preview.innerHTML = '';


    if (
      files.length > 5
    ) {

      el(
        'adminStatus'
      ).textContent =
        'Максимум 5 фотографий';


      el(
        'adminImages'
      ).value =
        '';


      return;
    }


    files.forEach(
      file => {

        const img =
          document.createElement(
            'img'
          );


        img.src =
          URL.createObjectURL(
            file
          );


        img.alt =
          'Предпросмотр';


        preview.appendChild(
          img
        );

      }
    );

  }
);


// =========================
// ДОБАВИТЬ ТОВАР
// =========================

el(
  'adminAddProductBtn'
)
?.addEventListener(
  'click',
  async () => {

    if (!isAdmin) {
      return;
    }


    const brand =
      el(
        'adminBrand'
      )?.value.trim() ||
      '';


    const name =
      el(
        'adminName'
      )?.value.trim() ||
      '';


    const categoryValue =
      el(
        'adminCategory'
      )?.value ||
      'Одежда';


    const price =
      Number(
        el(
          'adminPrice'
        )?.value ||
        0
      );


    const description =
      el(
        'adminDescription'
      )?.value.trim() ||
      '';


    const files = [
      ...(
        el(
          'adminImages'
        )?.files ||
        []
      )
    ];


    const sizeInputs = [
      ...document.querySelectorAll(
        '.adminVariantSize'
      )
    ];


    const stockInputs = [
      ...document.querySelectorAll(
        '.adminVariantStock'
      )
    ];


    const variants =
      sizeInputs

      .map(
        (
          input,
          index
        ) => ({

          size:
            input
              .value
              .trim(),

          stock:
            Number(
              stockInputs[
                index
              ]?.value ||
              0
            )

        })
      )

      .filter(
        variant =>
          variant.size &&
          variant.stock > 0
      );


    if (
      !brand ||
      !name ||
      !price ||
      !variants.length
    ) {

      el(
        'adminStatus'
      ).textContent =
        'Заполните обязательные поля';

      return;
    }


    if (
      !files.length
    ) {

      el(
        'adminStatus'
      ).textContent =
        'Добавьте хотя бы одну фотографию';

      return;
    }


    if (
      files.length > 5
    ) {

      el(
        'adminStatus'
      ).textContent =
        'Максимум 5 фотографий';

      return;
    }


    const button =
      el(
        'adminAddProductBtn'
      );


    try {

      if (button) {

        button.disabled =
          true;

      }


      el(
        'adminStatus'
      ).textContent =
        'Добавляем товар...';


      const formData =
        new FormData();


      addAdminAuth(
        formData
      );


      formData.append(
        'action',
        'create'
      );


      formData.append(
        'brand',
        brand
      );


      formData.append(
        'name',
        name
      );


      formData.append(
        'category',
        categoryValue
      );


      formData.append(
        'price',
        String(price)
      );


      formData.append(
        'description',
        description
      );


      formData.append(
        'variants',
        JSON.stringify(
          variants
        )
      );


      files.forEach(
        file =>
          formData.append(
            'images',
            file
          )
      );


      await adminAction(
        formData
      );


      el(
        'adminStatus'
      ).textContent =
        'Товар добавлен';


      el(
        'adminBrand'
      ).value =
        '';


      el(
        'adminName'
      ).value =
        '';


      el(
        'adminPrice'
      ).value =
        '';


      el(
        'adminDescription'
      ).value =
        '';


      el(
        'adminImages'
      ).value =
        '';


      el(
        'adminImagePreview'
      ).innerHTML =
        '';


      resetAdminVariants();


      await tryLoadSupabaseProducts();

      await loadAdminProducts();

    } catch (err) {

      console.error(
        err
      );


      el(
        'adminStatus'
      ).textContent =
        err.message;

    } finally {

      if (button) {

        button.disabled =
          false;

      }

    }

  }
);


// =========================
// АДМИН — СПИСОК
// =========================

function renderAdminProductList() {

  const wrap =
    el(
      'adminProductList'
    );


  if (
    !wrap ||
    !isAdmin
  ) {
    return;
  }


  const q =
    el(
      'adminProductSearch'
    )
    ?.value
    .trim()
    .toLowerCase() ||
    '';


  const list =
    allAdminProducts.filter(
      product =>

        !q ||

        product.name
          .toLowerCase()
          .includes(q) ||

        product.brand
          .toLowerCase()
          .includes(q)

    );


  wrap.innerHTML = '';


  if (
    !list.length
  ) {

    wrap.innerHTML =
      `<div class="empty">
        Товары не найдены
      </div>`;

    return;
  }


  list.forEach(
    product => {

      const row =
        document.createElement(
          'div'
        );


      row.className =
        'admin-product-row';


      const activeSizes =
        (
          product.variants ||
          []
        )

        .filter(
          v =>
            Number(
              v.stock
            ) > 0
        )

        .map(
          v =>
            v.size ||
            v.name
        )

        .filter(
          Boolean
        );


      row.innerHTML = `

        <div class="admin-product-row-main">

          ${
            product.image

            ? `

              <img
                class="admin-product-thumb"
                src="${escapeHtml(product.image)}"
                alt="${escapeHtml(product.name)}"
              >

            `

            : `

              <div class="admin-product-thumb admin-product-thumb-empty">
                □
              </div>

            `
          }


          <div class="admin-product-row-info">

            <div class="brand">
              ${escapeHtml(product.brand)}
            </div>

            <strong>
              ${escapeHtml(product.name)}
            </strong>

            <div class="admin-row-price">
              ${money(product.price)}
            </div>

            <div class="muted">

              ${
                product.active
                  ? 'В каталоге'
                  : 'Скрыт'
              }

              ${
                activeSizes.length

                ? ` · ${
                    activeSizes
                      .map(
                        escapeHtml
                      )
                      .join(', ')
                  }`

                : ' · Нет размеров в наличии'
              }

            </div>

          </div>

        </div>


        <div class="admin-product-row-actions">

          <button
            class="secondary-btn"
            data-action="open"
            type="button"
          >
            Редактировать
          </button>


          <button
            class="secondary-btn"
            data-action="toggle"
            type="button"
          >

            ${
              product.active
                ? 'Скрыть'
                : 'Вернуть'
            }

          </button>


          <button
            class="danger-mini-btn"
            data-action="delete"
            type="button"
          >
            Удалить
          </button>

        </div>

      `;


      // РЕДАКТИРОВАТЬ

      row
        .querySelector(
          '[data-action="open"]'
        )
        ?.addEventListener(
          'click',
          () => {

            selectedProduct =
              product;


            selectedVariant =
              (
                product.variants ||
                []
              )
              .find(
                v =>
                  Number(
                    v.stock
                  ) > 0
              ) ||
              null;


            renderProductSheet();

            openBackdrop();


            el(
              'productSheet'
            )
            ?.classList
            .remove(
              'hidden'
            );

          }
        );


      // СКРЫТЬ / ВЕРНУТЬ

      row
        .querySelector(
          '[data-action="toggle"]'
        )
        ?.addEventListener(
          'click',
          async event => {

            const button =
              event.currentTarget;


            try {

              button.disabled =
                true;


              const formData =
                new FormData();


              addAdminAuth(
                formData
              );


              formData.append(

                'action',

                product.active
                  ? 'hide'
                  : 'show'

              );


              formData.append(
                'product_id',
                String(
                  product.id
                )
              );


              await adminAction(
                formData
              );


              product.active =
                !product.active;


              if (
                product.active
              ) {

                const exists =
                  products.some(
                    item =>
                      String(
                        item.id
                      ) ===
                      String(
                        product.id
                      )
                  );


                if (!exists) {

                  products.unshift(
                    product
                  );

                }

              } else {

                products =
                  products.filter(
                    item =>
                      String(
                        item.id
                      ) !==
                      String(
                        product.id
                      )
                  );

              }


              renderProducts();

              renderAdminProductList();

            } catch (err) {

              alert(
                err.message
              );


              button.disabled =
                false;

            }

          }
        );


      // УДАЛИТЬ

      row
        .querySelector(
          '[data-action="delete"]'
        )
        ?.addEventListener(
          'click',
          async () => {

            if (
              !confirm(
                `Удалить «${product.name}»?`
              )
            ) {
              return;
            }


            try {

              const formData =
                new FormData();


              addAdminAuth(
                formData
              );


              formData.append(
                'action',
                'delete'
              );


              formData.append(
                'product_id',
                String(
                  product.id
                )
              );


              await adminAction(
                formData
              );


              products =
                products.filter(
                  item =>
                    String(
                      item.id
                    ) !==
                    String(
                      product.id
                    )
                );


              allAdminProducts =
                allAdminProducts.filter(
                  item =>
                    String(
                      item.id
                    ) !==
                    String(
                      product.id
                    )
                );


              favoriteIds.delete(
                String(
                  product.id
                )
              );


              saveFavorites();


              renderProducts();

              renderAdminProductList();

            } catch (err) {

              alert(
                err.message
              );

            }

          }
        );


      wrap.appendChild(
        row
      );

    }
  );

}


// =========================
// СОБЫТИЯ АДМИНКИ
// =========================

el(
  'adminProductSearch'
)
?.addEventListener(
  'input',
  renderAdminProductList
);


el(
  'refreshAdminProductsBtn'
)
?.addEventListener(
  'click',
  loadAdminProducts
);


// =========================
// ОБЩИЕ КНОПКИ
// =========================

el(
  'cartButton'
)
?.addEventListener(
  'click',
  openCart
);


el(
  'closeProductSheet'
)
?.addEventListener(
  'click',
  closeAll
);


el(
  'closeCartSheet'
)
?.addEventListener(
  'click',
  closeAll
);


el(
  'closeCheckoutSheet'
)
?.addEventListener(
  'click',
  closeAll
);


el(
  'sheetBackdrop'
)
?.addEventListener(
  'click',
  closeAll
);


el(
  'checkoutButton'
)
?.addEventListener(
  'click',
  openCheckout
);


el(
  'checkoutForm'
)
?.addEventListener(
  'submit',
  submitOrder
);


// =========================
// HTML ESCAPE
// =========================

function escapeHtml(
  value
) {

  return String(
    value ??
    ''
  )

  .replace(
    /&/g,
    '&amp;'
  )

  .replace(
    /</g,
    '&lt;'
  )

  .replace(
    />/g,
    '&gt;'
  )

  .replace(
    /"/g,
    '&quot;'
  )

  .replace(
    /'/g,
    '&#039;'
  );

}


// =========================
// СТАРТ
// =========================

updateFavoritesCount();

updateCartCount();

await tryLoadSupabaseProducts();

showStockSection();

calculatePoizon();
