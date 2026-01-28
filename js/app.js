// ============================================
// CONFIGURACION - CAMBIAR TU NUMERO DE WHATSAPP AQUI
// ============================================
const WHATSAPP_NUMBER = '573001234567'; // Cambia este numero por el tuyo (codigo de pais + numero)
const STORE_NAME = 'Mi Tienda'; // Nombre de tu tienda
const STORAGE_KEY = 'store_products'; // Clave para localStorage (debe coincidir con admin.js)
// ============================================

// Estado del carrito
let cart = [];
let productsCache = [];

// Cargar productos desde API / localStorage / defaults
function getProducts() {
    if (productsCache.length > 0) return productsCache;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        productsCache = JSON.parse(saved);
        return productsCache;
    }
    productsCache = products; // productos por defecto del archivo products.js
    return productsCache;
}

async function loadProductsFromApi() {
    try {
        const res = await fetch('/api/public/products');
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            productsCache = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return;
        }
    } catch (e) {
        // fallback to localStorage / defaults
    }
    getProducts();
}

// Elementos del DOM
const productsGrid = document.getElementById('productsGrid');
const categoriesNav = document.getElementById('categories');
const cartBtn = document.getElementById('cartBtn');
const cartCount = document.getElementById('cartCount');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const backToCart = document.getElementById('backToCart');
const sendWhatsApp = document.getElementById('sendWhatsApp');
const orderSummary = document.getElementById('orderSummary');
const customerForm = document.getElementById('customerForm');

// Inicializar la tienda
async function init() {
    await loadProductsFromApi();
    renderCategories();
    renderProducts();
    loadCart();
    reconcileCartIds();
    updateCart();
    setupEventListeners();
}

// Renderizar categorias
function renderCategories() {
    const currentProducts = getProducts();
    const categories = ['Todos', ...new Set(currentProducts.map(p => p.category))];

    categoriesNav.innerHTML = categories.map((cat, index) => `
        <button class="category-btn ${index === 0 ? 'active' : ''}" data-category="${cat}">
            ${cat}
        </button>
    `).join('');
}

// Renderizar productos
function renderProducts(category = 'Todos') {
    const currentProducts = getProducts();
    const filteredProducts = category === 'Todos'
        ? currentProducts
        : currentProducts.filter(p => p.category === category);

    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image placeholder">
                ${product.emoji || '🍽️'}
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">$${formatPrice(product.price)}</span>
                    <button class="add-to-cart" onclick="addToCart(${product.id})">
                        Agregar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Formatear precio
function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

// Agregar al carrito
function addToCart(productId) {
    const currentProducts = getProducts();
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            emoji: product.emoji,
            quantity: 1
        });
    }

    updateCart();
    saveCart();
    showToast(`${product.name} agregado al carrito`);
    animateCartButton();
}

// Actualizar cantidad
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
    }

    updateCart();
    saveCart();
}

// Eliminar del carrito
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
    saveCart();
}

// Actualizar UI del carrito
function updateCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCount.textContent = totalItems;
    cartTotal.textContent = `$${formatPrice(totalPrice)}`;
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <p>Tu carrito esta vacio</p>
                <p>Agrega productos para hacer tu pedido</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">${item.emoji || '🍽️'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${formatPrice(item.price)}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span class="cart-item-qty">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">Eliminar</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Guardar carrito en localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Cargar carrito desde localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Asegurar que el carrito tenga IDs de la base de datos
function reconcileCartIds() {
    if (!cart.length) return;
    const currentProducts = getProducts();
    const byName = new Map(currentProducts.map(p => [p.name.toLowerCase(), p]));
    let changed = false;

    cart.forEach(item => {
        const exists = currentProducts.some(p => p.id === item.id);
        if (!exists) {
            const match = byName.get(String(item.name).toLowerCase());
            if (match) {
                item.id = match.id;
                changed = true;
            }
        }
    });

    if (changed) {
        saveCart();
    }
}

// Mostrar resumen del pedido
function showOrderSummary() {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    orderSummary.innerHTML = `
        <h3>Resumen del pedido</h3>
        ${cart.map(item => `
            <div class="order-item">
                <span>${item.emoji} ${item.name} x${item.quantity}</span>
                <span>$${formatPrice(item.price * item.quantity)}</span>
            </div>
        `).join('')}
        <div class="order-total">
            <span>Total:</span>
            <span>$${formatPrice(totalPrice)}</span>
        </div>
    `;
}

// Generar mensaje de WhatsApp
function generateWhatsAppMessage() {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;
    const notes = document.getElementById('customerNotes').value;
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let message = `*NUEVO PEDIDO - ${STORE_NAME}*\n\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Telefono:* ${phone}\n`;
    message += `*Direccion:* ${address}\n`;

    if (notes) {
        message += `*Notas:* ${notes}\n`;
    }

    message += `\n*--- PRODUCTOS ---*\n`;

    cart.forEach(item => {
        message += `ID: ${item.id} - ${item.emoji} ${item.name}\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio: $${formatPrice(item.price * item.quantity)}\n\n`;
    });

    message += `*TOTAL: $${formatPrice(totalPrice)}*\n\n`;
    message += `Gracias por tu pedido!`;

    return encodeURIComponent(message);
}

// Enviar pedido por WhatsApp
function sendOrderToWhatsApp() {
    // Validar formulario
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();

    if (!name || !phone || !address) {
        showToast('Por favor completa todos los campos requeridos');
        return;
    }

    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');

    // Limpiar carrito despues de enviar
    cart = [];
    saveCart();
    updateCart();

    // Cerrar modales
    closeAllModals();

    showToast('Pedido enviado! Te esperamos en WhatsApp');
}

// Animacion del boton del carrito
function animateCartButton() {
    cartBtn.classList.add('animate');
    setTimeout(() => cartBtn.classList.remove('animate'), 300);
}

// Mostrar toast
function showToast(message) {
    // Remover toast existente
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Mostrar
    setTimeout(() => toast.classList.add('show'), 10);

    // Ocultar despues de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Abrir/cerrar carrito
function openCart() {
    cartSidebar.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartSidebar() {
    cartSidebar.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Abrir/cerrar modal de checkout
function openCheckoutModal() {
    showOrderSummary();
    closeCartSidebar();
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function closeAllModals() {
    closeCartSidebar();
    closeCheckoutModal();
    customerForm.reset();
}

// Event listeners
function setupEventListeners() {
    // Categorias
    categoriesNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(e.target.dataset.category);
        }
    });

    // Carrito
    cartBtn.addEventListener('click', openCart);
    closeCart.addEventListener('click', closeCartSidebar);
    cartOverlay.addEventListener('click', closeCartSidebar);

    // Checkout
    checkoutBtn.addEventListener('click', openCheckoutModal);
    closeModal.addEventListener('click', closeCheckoutModal);
    backToCart.addEventListener('click', () => {
        closeCheckoutModal();
        openCart();
    });
    sendWhatsApp.addEventListener('click', sendOrderToWhatsApp);

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Iniciar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', init);
