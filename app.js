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
const money = v => new Intl.NumberFormat('ru-RU').format(v) + ' ₽';
const totalStock = p => p.variants.reduce((s,v)=>s+Number(v.stock||0),0);

async function tryLoadSupabaseProducts(){
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try{
    const url = `${SUPABASE_URL}/rest/v1/products?select=id,brand,name,category,price,image_url,variants&active=eq.true&order=created_at.desc`;
    const res = await fetch(url,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
    if(!res.ok) throw new Error('Supabase load failed');
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
  const payload={
    telegram_user:tg?.initDataUnsafe?.user||null,
    telegram_init_data:tg?.initData||'',
    customer:{name:el('nameInput').value,phone:el('phoneInput').value,city:el('cityInput').value,comment:el('commentInput').value},
    items:cart,
    total:cart.reduce((s,i)=>s+i.price,0),
    created_at:new Date().toISOString()
  };

  el('checkoutStatus').textContent='Отправляем заявку...';
  try{
    if(SUPABASE_URL && SUPABASE_ANON_KEY){
      const res=await fetch(`${SUPABASE_URL}/rest/v1/poizon_orders`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
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

el('poizonPrice').addEventListener('input', calculatePoizon);
el('poizonWeight').addEventListener('input', calculatePoizon);
el('poizonDelivery').addEventListener('change', calculatePoizon);
el('poizonOrderButton').addEventListener('click', async () => {
  const yuan = Number(el('poizonPrice').value) || 0;
  const weight = Number(el('poizonWeight').value) || 0;
  const deliveryRate = Number(el('poizonDelivery').value) || 0;
  const link = el('poizonLink').value.trim();
  const size = el('poizonSize').value.trim();

  if (!yuan || !weight) {
    el('poizonOrderStatus').textContent = 'Укажите стоимость товара и вес.';
    return;
  }

  if (!link) {
    el('poizonOrderStatus').textContent = 'Вставьте ссылку на товар.';
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
    telegram_user: tg?.initDataUnsafe?.user || null,
    telegram_init_data: tg?.initData || '',

    customer: {
      type: 'poizon'
    },

    items: [
      {
        name: 'Заказ с Poizon',
        link: link,
        size: size,
        price_yuan: yuan,
        weight_kg: weight,
        delivery: deliveryName
      }
    ],

    total: finalTotal,
    created_at: new Date().toISOString()
  };

  el('poizonOrderStatus').textContent = 'Отправляем заявку...';

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

function showStockSection() {
  stockBtn.classList.add('active');
  poizonBtn.classList.remove('active');

  poizonSection.classList.add('hidden');

  document.querySelector('.hero').classList.remove('hidden');
  document.querySelector('.controls').classList.remove('hidden');
  el('productGrid').parentElement.classList.remove('hidden');
}

function showPoizonSection() {
  poizonBtn.classList.add('active');
  stockBtn.classList.remove('active');

  poizonSection.classList.remove('hidden');

  document.querySelector('.hero').classList.add('hidden');
  document.querySelector('.controls').classList.add('hidden');
  el('productGrid').parentElement.classList.add('hidden');
}

stockBtn.addEventListener('click', showStockSection);
poizonBtn.addEventListener('click', showPoizonSection);

// ===== END SECTION SWITCHER =====
