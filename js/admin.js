// ============================================
// CONFIGURACION DEL ADMIN
// ============================================
const ADMIN_PASSWORD = 'admin123'; // Cambia esta contrasena
const STORAGE_KEY = 'store_products';
// ============================================

// Estado
let productsData = [];
let editingProductId = null;
let deleteProductId = null;

// Elementos del DOM
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const addProductBtn = document.getElementById('addProductBtn');
const productsTableBody = document.getElementById('productsTableBody');
const emptyState = document.getElementById('emptyState');
const tableContainer = document.querySelector('.table-container');

// Stats
const totalProductsEl = document.getElementById('totalProducts');
const totalCategoriesEl = document.getElementById('totalCategories');
const avgPriceEl = document.getElementById('avgPrice');

// Product Modal
const productModal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const productForm = document.getElementById('productForm');
const closeModalBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const productCategorySelect = document.getElementById('productCategorySelect');

// Delete Modal
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteProductName = document.getElementById('deleteProductName');

// Export/Import
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const resetBtn = document.getElementById('resetBtn');

// ========== INICIALIZACION ==========
function init() {
    checkAuth();
    loadProducts();
    setupEventListeners();
}

// ========== AUTENTICACION ==========
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('admin_logged_in');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    }
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_logged_in', 'true');
        showAdminPanel();
        showToast('Bienvenido al panel de administracion', 'success');
    } else {
        showToast('Contrasena incorrecta', 'error');
    }
}

function logout() {
    sessionStorage.removeItem('admin_logged_in');
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
    document.getElementById('password').value = '';
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    renderProducts();
    updateStats();
    updateCategoryFilters();
}

// ========== CARGAR/GUARDAR PRODUCTOS ==========
function loadProducts() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        productsData = JSON.parse(saved);
    } else {
        // Usar productos por defecto del archivo products.js
        productsData = [...products];
        saveProducts();
    }
}

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productsData));
    // Actualizar tambien la variable global para la tienda
    if (typeof window.products !== 'undefined') {
        window.products = productsData;
    }
}

// ========== RENDERIZAR ==========
function renderProducts(filter = '') {
    const categoryFilterValue = categoryFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    let filtered = productsData.filter(p => {
        const matchesCategory = !categoryFilterValue || p.category === categoryFilterValue;
        const matchesSearch = !searchTerm ||
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';

    productsTableBody.innerHTML = filtered.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>
                <div class="product-cell">
                    <span class="product-emoji">${product.emoji || '📦'}</span>
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p>${product.description || 'Sin descripcion'}</p>
                    </div>
                </div>
            </td>
            <td><span class="category-badge">${product.category}</span></td>
            <td class="price-cell">$${formatPrice(product.price)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon btn-edit" onclick="openEditModal(${product.id})" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="openDeleteModal(${product.id})" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    const total = productsData.length;
    const categories = [...new Set(productsData.map(p => p.category))];
    const avgPrice = total > 0 ? productsData.reduce((sum, p) => sum + p.price, 0) / total : 0;

    totalProductsEl.textContent = total;
    totalCategoriesEl.textContent = categories.length;
    avgPriceEl.textContent = `$${formatPrice(Math.round(avgPrice))}`;
}

function updateCategoryFilters() {
    const categories = [...new Set(productsData.map(p => p.category))].sort();

    // Filter dropdown
    categoryFilter.innerHTML = '<option value="">Todas las categorias</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    // Modal select
    productCategorySelect.innerHTML = '<option value="">Seleccionar existente...</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function formatPrice(price) {
    return price.toLocaleString('es-CO');
}

// ========== CRUD OPERACIONES ==========
function getNextId() {
    if (productsData.length === 0) return 1;
    return Math.max(...productsData.map(p => p.id)) + 1;
}

function addProduct(productData) {
    const newProduct = {
        id: getNextId(),
        ...productData
    };
    productsData.push(newProduct);
    saveProducts();
    renderProducts();
    updateStats();
    updateCategoryFilters();
    showToast('Producto agregado correctamente', 'success');
}

function updateProduct(id, productData) {
    const index = productsData.findIndex(p => p.id === id);
    if (index !== -1) {
        productsData[index] = { ...productsData[index], ...productData };
        saveProducts();
        renderProducts();
        updateStats();
        updateCategoryFilters();
        showToast('Producto actualizado correctamente', 'success');
    }
}

function deleteProduct(id) {
    productsData = productsData.filter(p => p.id !== id);
    saveProducts();
    renderProducts();
    updateStats();
    updateCategoryFilters();
    showToast('Producto eliminado', 'success');
}

// ========== MODALES ==========
function openAddModal() {
    editingProductId = null;
    modalTitle.textContent = 'Agregar Producto';
    productForm.reset();
    document.getElementById('productId').value = '';
    productModal.classList.add('active');
}

function openEditModal(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;
    modalTitle.textContent = 'Editar Producto';

    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productEmoji').value = product.emoji || '';
    document.getElementById('productCategorySelect').value = product.category;
    document.getElementById('productCategoryNew').value = '';

    productModal.classList.add('active');
}

function closeProductModal() {
    productModal.classList.remove('active');
    editingProductId = null;
}

function openDeleteModal(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    deleteProductId = id;
    deleteProductName.textContent = product.name;
    deleteModal.classList.add('active');
}

function closeDeleteModalFn() {
    deleteModal.classList.remove('active');
    deleteProductId = null;
}

// ========== FORMULARIO ==========
function handleProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = parseInt(document.getElementById('productPrice').value);
    const emoji = document.getElementById('productEmoji').value.trim() || '📦';
    const categorySelect = document.getElementById('productCategorySelect').value;
    const categoryNew = document.getElementById('productCategoryNew').value.trim();
    const category = categoryNew || categorySelect;

    if (!name || !price || !category) {
        showToast('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    const productData = { name, description, price, emoji, category };

    if (editingProductId) {
        updateProduct(editingProductId, productData);
    } else {
        addProduct(productData);
    }

    closeProductModal();
}

// ========== EXPORT/IMPORT ==========
function exportProducts() {
    const dataStr = JSON.stringify(productsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos.json';
    a.click();

    URL.revokeObjectURL(url);
    showToast('Productos exportados correctamente', 'success');
}

function importProducts(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) {
                throw new Error('Formato invalido');
            }

            // Validar estructura basica
            const isValid = imported.every(p => p.name && p.price && p.category);
            if (!isValid) {
                throw new Error('Algunos productos no tienen los campos requeridos');
            }

            // Reasignar IDs para evitar conflictos
            let nextId = getNextId();
            imported.forEach(p => {
                p.id = nextId++;
            });

            productsData = [...productsData, ...imported];
            saveProducts();
            renderProducts();
            updateStats();
            updateCategoryFilters();
            showToast(`${imported.length} productos importados`, 'success');
        } catch (error) {
            showToast('Error al importar: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function resetToDefault() {
    if (confirm('¿Estas seguro? Esto eliminara todos los cambios y restaurara los productos por defecto.')) {
        productsData = [...products]; // Usar los productos originales del archivo
        saveProducts();
        renderProducts();
        updateStats();
        updateCategoryFilters();
        showToast('Productos restaurados a valores por defecto', 'success');
    }
}

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        ${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'}
        ${message}
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login(document.getElementById('password').value);
    });

    logoutBtn.addEventListener('click', logout);

    // Search and filter
    searchInput.addEventListener('input', () => renderProducts());
    categoryFilter.addEventListener('change', () => renderProducts());

    // Add product
    addProductBtn.addEventListener('click', openAddModal);

    // Product modal
    closeModalBtn.addEventListener('click', closeProductModal);
    cancelBtn.addEventListener('click', closeProductModal);
    productForm.addEventListener('submit', handleProductSubmit);

    // Delete modal
    closeDeleteModal.addEventListener('click', closeDeleteModalFn);
    cancelDeleteBtn.addEventListener('click', closeDeleteModalFn);
    confirmDeleteBtn.addEventListener('click', () => {
        if (deleteProductId) {
            deleteProduct(deleteProductId);
            closeDeleteModalFn();
        }
    });

    // Export/Import
    exportBtn.addEventListener('click', exportProducts);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importProducts(e.target.files[0]);
            e.target.value = '';
        }
    });
    resetBtn.addEventListener('click', resetToDefault);

    // Close modals on overlay click
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
    });
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModalFn();
    });

    // Close with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeDeleteModalFn();
        }
    });
}

// Iniciar
document.addEventListener('DOMContentLoaded', init);
