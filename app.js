import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

let products = [];
let category = 'Все';
let selectedProduct = null;
let selectedVariant = null;
const cart = [];

const el = id => document.getElementById(id);

const ADMIN_TELEGRAM_ID = 1023844365;
const currentTelegramId = Number(tg?.initDataUnsafe?.user?.id || 0);

console.log('MY TELEGRAM ID:', currentTelegramId);

if (currentTelegramId === ADMIN_TELEGRAM_ID) {
  el('adminSectionBtn')?.classList.remove('hidden');
}


const money = v => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
const totalStock = p => p.variants.reduce((s,v)=>s+Number(v.stock||0),0);

async function tryLoadSupabaseProducts(){
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try{
    const url = `${SUPABASE_URL}/rest/v1/products?select=id,brand,name,category,price,image_url,variants&active=eq.true&order=created_at.desc`;
    const res = await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    if (!res.ok) {
  const errorText = await res.text();
  throw new Error('Supabase load failed: ' + errorText);
}
    const data = await res.json();
    if(Array.isArray(data) && data.length){
      products = data.map(p=>({
        id:p.id, brand:p.brand, name:p.name, category:p.category, price:Number(p.price), image:p.image_url||'', icon:'□', variants:Array.isArray(p.variants)?p.variants:[]
      }));
    }
  }catch(err){ console.warn(err); }
}

function renderCategories(){
  const cats = ['Все', ...new Set(products.map(p=>p.category))];
  el('categoryTabs').innerHTML='';
  cats.forEach(c=>{
    const b=document.createElement('button');
    b.type='button'; b.className='tab'+(c===category?' active':''); b.textContent=c;
    b.addEventListener('click',()=>{category=c;renderCategories();renderProducts();});
    el('categoryTabs').appendChild(b);
  });
}

function filteredProducts(){
  const q=el('searchInput').value.trim().toLowerCase();
  let list=products.filter(p=>(category==='Все'||p.category===category) && (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)));
  if(el('sortSelect').value==='priceAsc') list.sort((a,b)=>a.price-b.price);
  if(el('sortSelect').value==='priceDesc') list.sort((a,b)=>b.price-a.price);
  return list;
}

function renderProducts(){
  const list=filteredProducts();
  el('resultCount').textContent=`${list.length} позиций`;
  el('productGrid').innerHTML='';
  list.forEach(p=>{
    const card=document.createElement('button'); card.type='button'; card.className='product-card';
    const visual=p.image?`<img src="${p.image}" alt="${p.name}">`:`${p.icon}`;
    card.innerHTML=`<div class="product-image">${visual}</div><div class="brand">${p.brand}</div><div class="product-name">${p.name}</div><div class="price">${money(p.price)}</div><div class="stock">${totalStock(p)} шт. в наличии</div>`;
    card.addEventListener('click',()=>openProduct(p));
    el('productGrid').appendChild(card);
  });
}

function openBackdrop(){el('sheetBackdrop').classList.remove('hidden')}
function closeAll(){['productSheet','cartSheet','checkoutSheet','sheetBackdrop'].forEach(id=>el(id).classList.add('hidden'))}

function openProduct(p){
  selectedProduct=p; selectedVariant=p.variants.find(v=>Number(v.stock)>0)||null;
  renderProductSheet(); openBackdrop(); el('productSheet').classList.remove('hidden');
}

function renderProductSheet(){
  const p=selectedProduct; if(!p) return;
  const visual=p.image?`<img src="${p.image}" alt="${p.name}">`:`${p.icon}`;
  el('productSheetContent').innerHTML=`
    <div class="detail-image">${visual}</div>
    <div class="brand">${p.brand}</div>
    <div class="detail-title">${p.name}</div>
    <div class="detail-price">${money(p.price)}</div>
    <div class="muted">Выберите размер / объём</div>
    <div id="variantList" class="variant-list"></div>
    <div id="variantStock" class="muted"></div>
    <div style="height:14px"></div>
    <button id="addToCartBtn" class="primary-btn">Добавить в корзину</button>`;
  const wrap=el('variantList');
  p.variants.forEach(v=>{
    const b=document.createElement('button'); b.type='button'; b.className='variant-btn'+(selectedVariant===v?' active':''); b.disabled=Number(v.stock)<1; b.textContent=`${v.name} · ${v.stock}`;
    b.addEventListener('click',()=>{selectedVariant=v;renderProductSheet();}); wrap.appendChild(b);
  });
  el('variantStock').textContent=selectedVariant?`Осталось: ${selectedVariant.stock} шт.`:'Нет в наличии';
  el('addToCartBtn').addEventListener('click',()=>{
    if(!selectedVariant) return;
    cart.push({productId:p.id,brand:p.brand,name:p.name,variant:selectedVariant.name,price:p.price});
    updateCartCount();
    tg?.HapticFeedback?.impactOccurred('light');
    closeAll();
  });
}

function updateCartCount(){el('cartCount').textContent=cart.length}
function renderCart(){
  const wrap=el('cartItems'); wrap.innerHTML='';
  if(!cart.length){wrap.innerHTML='<div class="empty">Корзина пока пустая</div>';}
  cart.forEach((item,i)=>{
    const row=document.createElement('div'); row.className='cart-item';
    row.innerHTML=`<div><div class="brand">${item.brand}</div><strong>${item.name}</strong><div class="muted">${item.variant}</div></div><div style="text-align:right"><div>${money(item.price)}</div><button class="secondary-btn" data-index="${i}" type="button">Удалить</button></div>`;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll('[data-index]').forEach(b=>b.addEventListener('click',()=>{cart.splice(Number(b.dataset.index),1);updateCartCount();renderCart();}));
  el('cartTotal').textContent=money(cart.reduce((s,i)=>s+i.price,0));
  el('checkoutButton').disabled=!cart.length;
}

function openCart(){renderCart();openBackdrop();el('cartSheet').classList.remove('hidden')}
function openCheckout(){if(!cart.length)return;el('cartSheet').classList.add('hidden');el('checkoutSheet').classList.remove('hidden');const u=tg?.initDataUnsafe?.user;if(u) el('nameInput').value=[u.first_name,u.last_name].filter(Boolean).join(' ')}

async function submitOrder(e){
  e.preventDefault();
  const telegram = el('stockTelegram').value.trim();

if (!telegram) {
  el('checkoutStatus').textContent = 'Укажите ваш Telegram';
  return;
}
  const payload = {
  telegram_user: {
    username: telegram.replace(/^@/, '')
  },
  telegram_init_data: tg?.initData || '',

  customer: {
    telegram: telegram
  },

  items: cart,
  total: cart.reduce((s, i) => s + i.price, 0),
  created_at: new Date().toISOString()
};

  el('checkoutStatus').textContent='Отправляем заявку...';
  try{
    if(SUPABASE_URL && SUPABASE_ANON_KEY){
      const res=await fetch(`${SUPABASE_URL}/rest/v1/orders`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('Не удалось сохранить заказ');
    } else {
      console.log('DEMO ORDER',payload);
    }
    el('checkoutStatus').textContent='Заявка создана. Мы свяжемся с вами в Telegram.';
    tg?.HapticFeedback?.notificationOccurred('success');
    cart.splice(0); updateCartCount();
  }catch(err){
    console.error(err); el('checkoutStatus').textContent='Ошибка отправки. Попробуйте ещё раз.';
    tg?.HapticFeedback?.notificationOccurred('error');
  }
}

el('searchInput').addEventListener('input',renderProducts);
el('sortSelect').addEventListener('change',renderProducts);
el('cartButton').addEventListener('click',openCart);
el('closeProductSheet').addEventListener('click',closeAll);
el('closeCartSheet').addEventListener('click',closeAll);
el('closeCheckoutSheet').addEventListener('click',closeAll);
el('sheetBackdrop').addEventListener('click',closeAll);
el('checkoutButton').addEventListener('click',openCheckout);
el('checkoutForm').addEventListener('submit',submitOrder);

await tryLoadSupabaseProducts();
renderCategories();renderProducts();updateCartCount();
// ===== POIZON CALCULATOR =====

const POIZON_RATE = 12.7;
const POIZON_COMMISSION = 700;

function calculatePoizon() {
  const yuan = Number(el('poizonPrice').value) || 0;
  const weight = Number(el('poizonWeight').value) || 0;
  const deliveryRate = Number(el('poizonDelivery').value) || 0;

  const productTotal = yuan * POIZON_RATE;
  const deliveryTotal = weight * deliveryRate;
  const finalTotal = productTotal + deliveryTotal + POIZON_COMMISSION;

  
  el('poizonFinalTotal').textContent = money(Math.round(finalTotal));
}
document.querySelectorAll('.delivery-option').forEach(button => {
  button.addEventListener('click', () => {

    document.querySelectorAll('.delivery-option').forEach(btn => {
      btn.classList.remove('active');
    });

    button.classList.add('active');

    el('poizonDelivery').value = button.dataset.rate;

    calculatePoizon();
  });
});
el('poizonPrice').addEventListener('input', calculatePoizon);
el('poizonWeight').addEventListener('input', calculatePoizon);
el('poizonOrderButton').addEventListener('click', async () => {
  const yuan = Number(el('poizonPrice').value) || 0;
  const weight = Number(el('poizonWeight').value) || 0;
  const deliveryRate = Number(el('poizonDelivery').value) || 0;
 const telegram = el('poizonTelegram').value.trim();
  if (!telegram) {
  el('poizonOrderStatus').textContent = 'Укажите ваш Telegram';
  return;
}
el('poizonPrice').value = '';
el('poizonWeight').value = '';
el('poizonTelegram').value = '';

el('poizonDelivery').value = '850';

document.querySelectorAll('.delivery-option').forEach(btn => {
  btn.classList.remove('active');
});

document
  .querySelector('.delivery-option[data-rate="850"]')
  ?.classList.add('active');

calculatePoizon();
  if (!yuan || !weight) {
    el('poizonOrderStatus').textContent = 'Укажите стоимость товара и вес.';
    return;
  }

  

  const productTotal = yuan * POIZON_RATE;
  const deliveryTotal = weight * deliveryRate;
  const finalTotal = Math.round(
    productTotal + deliveryTotal + POIZON_COMMISSION
  );

  const deliveryName =
    deliveryRate === 2500 ? 'Авиа' : 'Авто';

const payload = {
  telegram: telegram,
  price_yuan: yuan,
  weight: weight,
  delivery: deliveryName,
  total: finalTotal,
  created_at: new Date().toISOString()
};

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/poizon_orders`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!res.ok) {
      throw new Error('Не удалось сохранить заказ');
    }

    el('poizonOrderStatus').textContent =
      'Заявка отправлена. Мы свяжемся с вами в Telegram.';

    tg?.HapticFeedback?.notificationOccurred('success');

  } catch (err) {
    console.error(err);

    el('poizonOrderStatus').textContent =
      'Ошибка отправки. Попробуйте ещё раз.';

    tg?.HapticFeedback?.notificationOccurred('error');
  }
});
// ===== SECTION SWITCHER =====

const stockBtn = el('stockSectionBtn');
const poizonBtn = el('poizonSectionBtn');
const poizonSection = el('poizonSection');
const adminBtn = el('adminSectionBtn');
const adminSection = el('adminSection');
function showAdminSection() {
  adminBtn.classList.add('active');
  stockBtn.classList.remove('active');
  poizonBtn.classList.remove('active');

  adminSection.classList.remove('hidden');
  poizonSection.classList.add('hidden');

  document.querySelector('.hero').classList.add('hidden');
  document.querySelector('.controls').classList.add('hidden');
  el('productGrid').parentElement.classList.add('hidden');
}

function showStockSection() {
  stockBtn.classList.add('active');
  poizonBtn.classList.remove('active');adminBtn.classList.remove('active');
adminSection.classList.add('hidden');

  poizonSection.classList.add('hidden');

  document.querySelector('.hero').classList.remove('hidden');
  document.querySelector('.controls').classList.remove('hidden');
  el('productGrid').parentElement.classList.remove('hidden');
}

function showPoizonSection() {
  poizonBtn.classList.add('active');
  stockBtn.classList.remove('active');
adminBtn.classList.remove('active');
adminSection.classList.add('hidden');
  poizonSection.classList.remove('hidden');

  document.querySelector('.hero').classList.add('hidden');
  document.querySelector('.controls').classList.add('hidden');
  el('productGrid').parentElement.classList.add('hidden');
}

stockBtn.addEventListener('click', showStockSection);
poizonBtn.addEventListener('click', showPoizonSection);
adminBtn.addEventListener('click', showAdminSection);
// ===== END SECTION SWITCHER =====
const adminAddProductBtn = el('adminAddProductBtn');

adminAddProductBtn?.addEventListener('click', async () => {
  const brand = el('adminBrand')?.value.trim();
  const name = el('adminName')?.value.trim();
  const category = el('adminCategory')?.value;
  const price = Number(el('adminPrice')?.value || 0);
  const description = el('adminDescription')?.value.trim();
  const size = el('adminSize')?.value.trim();
  const stock = Number(el('adminStock')?.value || 0);
  const files = [...(el('adminImages')?.files || [])];

  if (!brand || !name || !price || !size || !stock) {
    el('adminStatus').textContent = 'Заполните все поля';
    return;
  }

  if (!files.length) {
    el('adminStatus').textContent = 'Добавьте хотя бы одно фото';
    return;
  }

  if (files.length > 5) {
    el('adminStatus').textContent = 'Максимум 5 фотографий';
    return;
  }

  el('adminStatus').textContent = 'Загружаем товар...';

  try {
    const images = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop() || 'jpg';

      const fileName =
        `admin/${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${ext}`;

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/product-images/${fileName}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': file.type
          },
          body: file
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error('Фото: ' + err);
      }

      images.push(
        `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`
      );
    }

    const product = {
      brand,
      name,
      category,
      price,
      image_url: images[0],
      images,
      description,
      variants: [
        {
          size,
          stock
        }
      ],
      active: true
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(product)
      }
    );

    if (!res.ok) {
  const err = await res.text();

  console.error('PRODUCT INSERT ERROR:', res.status, err);

  el('adminStatus').textContent =
    `Ошибка добавления (${res.status}): ${err}`;

  return;
}

    el('adminStatus').textContent = 'Товар добавлен';

    el('adminBrand').value = '';
    el('adminName').value = '';
    el('adminPrice').value = '';
    el('adminDescription').value = '';
    el('adminSize').value = '';
    el('adminStock').value = '1';
    el('adminImages').value = '';

    await tryLoadSupabaseProducts();
    renderCategories();
    renderProducts();

  } catch (err) {
    console.error(err);
    el('adminStatus').textContent = 'Ошибка: ' + err.message;
  }
});
