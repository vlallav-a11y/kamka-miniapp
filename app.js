import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

const demoProducts = [
  {id:1,brand:'STONE ISLAND',name:'Ghost Overshirt',category:'Одежда',price:24900,icon:'◼',image:'',variants:[{name:'M',stock:1},{name:'L',stock:2},{name:'XL',stock:1}]},
  {id:2,brand:'C.P. COMPANY',name:'Chrome-R Hoodie',category:'Одежда',price:18900,icon:'▦',image:'',variants:[{name:'M',stock:1},{name:'L',stock:1}]},
  {id:3,brand:'NIKE',name:'Air Force 1',category:'Обувь',price:12900,icon:'◒',image:'',variants:[{name:'41',stock:1},{name:'42',stock:2},{name:'43',stock:1}]},
  {id:4,brand:'CREED',name:'Aventus Decant',category:'Парфюм',price:3490,icon:'◇',image:'',variants:[{name:'5 мл',stock:8},{name:'10 мл',stock:4}]},
  {id:5,brand:'CREED',name:'Silver Mountain Water',category:'Парфюм',price:3190,icon:'◆',image:'',variants:[{name:'5 мл',stock:6},{name:'10 мл',stock:3}]},
  {id:6,brand:'BURBERRY',name:'London Decant',category:'Парфюм',price:1990,icon:'◈',image:'',variants:[{name:'5 мл',stock:6},{name:'10 мл',stock:3}]}
];

let products = [...demoProducts];
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
