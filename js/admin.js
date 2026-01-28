// ============================================
// ADMIN PANEL - API CLIENT
// ============================================
const API_BASE = '/api';
const TOKEN_KEY = 'admin_token';
// ============================================

// ========== STATE ==========
let productsData = [];
let ventasData = [];
let comprasData = [];
let gastosData = [];
let editingProductId = null;
let deleteProductId = null;
let currentView = 'dashboard';

// Venta temp state
let ventaProducts = [];
let ventaSelectedProduct = null;

// Compra temp state
let compraProducts = [];

// ========== API HELPER ==========
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

async function api(endpoint, options = {}) {
    const token = getToken();
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        ...options
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (res.status === 401) {
        // Session expired
        localStorage.removeItem(TOKEN_KEY);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
        showToast('Sesión expirada, inicia sesión de nuevo', 'error');
        throw new Error('Unauthorized');
    }

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Error del servidor');
    }
    return data;
}

// ========== INIT ==========
function init() {
    checkAuth();
    setupEventListeners();
    setDefaultDates();
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const compraFecha = document.getElementById('compraFecha');
    const gastoFecha = document.getElementById('gastoFecha');
    if (compraFecha) compraFecha.value = today;
    if (gastoFecha) gastoFecha.value = today;
}

// ========== AUTH ==========
async function checkAuth() {
    const token = getToken();
    if (!token) return;

    try {
        await api('/auth/check');
        showAdminPanel();
    } catch (e) {
        localStorage.removeItem(TOKEN_KEY);
    }
}

async function login(user, password) {
    try {
        const data = await api('/login', {
            method: 'POST',
            body: JSON.stringify({ username: user, password })
        });

        localStorage.setItem(TOKEN_KEY, data.token);
        showAdminPanel();
        showToast('Bienvenido al panel de administración', 'success');
    } catch (e) {
        showToast(e.message || 'Usuario o contraseña incorrecta', 'error');
    }
}

async function logout() {
    try {
        await api('/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }

    localStorage.removeItem(TOKEN_KEY);
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPassword').value = '';
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    navigateTo('dashboard');
}

// ========== DATA LOADING ==========
async function loadProducts() {
    try {
        productsData = await api('/products');
    } catch (e) {
        console.error('Error loading products:', e);
    }
}

async function loadVentas() {
    try {
        ventasData = await api('/ventas');
    } catch (e) {
        console.error('Error loading ventas:', e);
    }
}

async function loadCompras() {
    try {
        comprasData = await api('/compras');
    } catch (e) {
        console.error('Error loading compras:', e);
    }
}

async function loadGastos() {
    try {
        gastosData = await api('/gastos');
    } catch (e) {
        console.error('Error loading gastos:', e);
    }
}

// ========== NAVIGATION ==========
async function navigateTo(view) {
    currentView = view;
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    // Show target view
    const viewId = 'view' + view.charAt(0).toUpperCase() + view.slice(1);
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.style.display = 'block';

    // Toggle back button
    const btnBack = document.getElementById('btnBack');
    btnBack.style.display = view === 'dashboard' ? 'none' : 'flex';

    // Load data and update view
    switch (view) {
        case 'dashboard':
            await updateDashboard();
            break;
        case 'inventario':
            await loadProducts();
            renderInventory();
            updateInventoryStats();
            break;
        case 'venta':
            await loadProducts();
            await loadVentas();
            updateVentasCount();
            renderVentaProducts();
            break;
        case 'compra':
            await loadProducts();
            await loadCompras();
            updateComprasCount();
            renderCompraProducts();
            break;
        case 'gastos':
            await loadGastos();
            renderGastos();
            updateGastosStats();
            break;
    }
}

// ========== DASHBOARD ==========
async function updateDashboard() {
    try {
        const data = await api('/dashboard');
        document.getElementById('dashTotalProducts').textContent = data.totalProducts;
        document.getElementById('dashVentasMes').textContent = '$' + formatPrice(data.ventasMes);
        document.getElementById('dashGastosMes').textContent = '$' + formatPrice(data.gastosMes);
    } catch (e) {
        console.error('Error loading dashboard:', e);
    }
}

// ========== INVENTORY ==========
function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    const tableContainer = document.querySelector('#viewInventario .table-container');
    const emptyState = document.getElementById('inventoryEmpty');

    if (productsData.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';

    tbody.innerHTML = productsData.map(p => {
        const existencia = (p.cantidad || 0) - (p.vendido || 0);
        const ganancia = ((p.precioVenta || 0) - (p.precioCompra || 0)) * (p.vendido || 0);
        return `
            <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category)}</td>
                <td><span style="font-size:1.5rem;">${p.emoji || '📦'}</span></td>
                <td>$${formatPrice(p.precioCompra || 0)}</td>
                <td>$${formatPrice(p.precioVenta || 0)}</td>
                <td>${p.cantidad || 0}</td>
                <td>${p.vendido || 0}</td>
                <td>${existencia}</td>
                <td class="profit-cell">$${formatPrice(ganancia)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="openEditModal(${p.id})" title="Editar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="openDeleteModal(${p.id})" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateInventoryStats() {
    const totalProducts = productsData.length;
    const totalStock = productsData.reduce((sum, p) => sum + ((p.cantidad || 0) - (p.vendido || 0)), 0);
    const totalProfit = productsData.reduce((sum, p) => {
        return sum + ((p.precioVenta || 0) - (p.precioCompra || 0)) * (p.vendido || 0);
    }, 0);

    document.getElementById('invTotalProducts').textContent = totalProducts;
    document.getElementById('invTotalStock').textContent = totalStock;
    document.getElementById('invTotalProfit').textContent = '$' + formatPrice(totalProfit);
}

function updateCategoryOptions() {
    const categories = [...new Set(productsData.map(p => p.category))].sort();
    const select = document.getElementById('productCategorySelect');
    select.innerHTML = '<option value="">Seleccionar existente...</option>' +
        categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
}

// ========== PRODUCT CRUD ==========
function openAddModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Agregar Producto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    updateCategoryOptions();
    document.getElementById('productModal').classList.add('active');
}

function openEditModal(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productEmoji').value = product.emoji || '';
    document.getElementById('productPrecioCompra').value = product.precioCompra || 0;
    document.getElementById('productPrecioVenta').value = product.precioVenta || 0;
    document.getElementById('productCantidad').value = product.cantidad || 0;
    document.getElementById('productVendido').value = product.vendido || 0;

    updateCategoryOptions();
    document.getElementById('productCategorySelect').value = product.category;
    document.getElementById('productCategoryNew').value = '';

    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const emoji = document.getElementById('productEmoji').value.trim() || '📦';
    const categorySelect = document.getElementById('productCategorySelect').value;
    const categoryNew = document.getElementById('productCategoryNew').value.trim();
    const category = categoryNew || categorySelect;
    const precioCompra = parseInt(document.getElementById('productPrecioCompra').value) || 0;
    const precioVenta = parseInt(document.getElementById('productPrecioVenta').value) || 0;
    const cantidad = parseInt(document.getElementById('productCantidad').value) || 0;
    const vendido = parseInt(document.getElementById('productVendido').value) || 0;

    if (!name || !category || !precioVenta) {
        showToast('Completa todos los campos requeridos', 'error');
        return;
    }

    const productData = { name, emoji, category, precioCompra, precioVenta, cantidad, vendido };

    try {
        if (editingProductId) {
            await api(`/products/${editingProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showToast('Producto actualizado', 'success');
        } else {
            await api('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showToast('Producto agregado', 'success');
        }

        await loadProducts();
        renderInventory();
        updateInventoryStats();
        closeProductModal();
    } catch (e) {
        showToast(e.message || 'Error al guardar producto', 'error');
    }
}

function openDeleteModal(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;
    deleteProductId = id;
    document.getElementById('deleteProductName').textContent = product.name;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteProductId = null;
}

async function confirmDelete() {
    if (!deleteProductId) return;

    try {
        await api(`/products/${deleteProductId}`, { method: 'DELETE' });
        await loadProducts();
        renderInventory();
        updateInventoryStats();
        showToast('Producto eliminado', 'success');
        closeDeleteModal();
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}

// ========== VENTA MODULE ==========
function updateVentasCount() {
    document.getElementById('ventasCount').textContent = ventasData.length;
}

function searchProductsForVenta(query) {
    const results = document.getElementById('ventaSearchResults');
    if (query.length < 2) {
        results.classList.remove('active');
        return;
    }

    const matches = productsData.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    if (matches.length === 0) {
        results.classList.remove('active');
        return;
    }

    results.innerHTML = matches.map(p => `
        <div class="search-result-item" onclick="selectVentaProduct(${p.id})">
            <span>${p.emoji || '📦'} ${escapeHtml(p.name)}</span>
            <span class="result-price">$${formatPrice(p.precioVenta || 0)}</span>
        </div>
    `).join('');
    results.classList.add('active');
}

function selectVentaProduct(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    ventaSelectedProduct = product;
    document.getElementById('ventaProductSearch').value = product.name;
    document.getElementById('ventaPrecio').value = '$' + formatPrice(product.precioVenta || 0);
    document.getElementById('ventaStock').value = (product.cantidad || 0) - (product.vendido || 0);
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaSearchResults').classList.remove('active');
}

function addVentaProduct() {
    if (!ventaSelectedProduct) {
        showToast('Selecciona un producto primero', 'error');
        return;
    }

    const cantidad = parseInt(document.getElementById('ventaCantidad').value) || 1;
    const stock = (ventaSelectedProduct.cantidad || 0) - (ventaSelectedProduct.vendido || 0);

    if (cantidad > stock) {
        showToast('No hay suficiente stock', 'error');
        return;
    }

    const existing = ventaProducts.find(vp => vp.productId === ventaSelectedProduct.id);
    if (existing) {
        existing.cantidad += cantidad;
        existing.total = existing.cantidad * existing.precioUnit;
    } else {
        ventaProducts.push({
            productId: ventaSelectedProduct.id,
            nombre: ventaSelectedProduct.name,
            precioUnit: ventaSelectedProduct.precioVenta || 0,
            cantidad: cantidad,
            total: (ventaSelectedProduct.precioVenta || 0) * cantidad
        });
    }

    ventaSelectedProduct = null;
    document.getElementById('ventaProductSearch').value = '';
    document.getElementById('ventaPrecio').value = '';
    document.getElementById('ventaStock').value = '';
    document.getElementById('ventaCantidad').value = 1;

    renderVentaProducts();
}

function renderVentaProducts() {
    const tbody = document.getElementById('ventaProductsBody');
    const table = document.getElementById('ventaProductsTable');
    const empty = document.getElementById('ventaProductsEmpty');

    if (ventaProducts.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
    } else {
        table.style.display = 'table';
        empty.style.display = 'none';

        tbody.innerHTML = ventaProducts.map((vp, i) => `
            <tr>
                <td>${escapeHtml(vp.nombre)}</td>
                <td>$${formatPrice(vp.precioUnit)}</td>
                <td>${vp.cantidad}</td>
                <td class="profit-cell">$${formatPrice(vp.total)}</td>
                <td>
                    <button class="btn-icon btn-delete" onclick="removeVentaProduct(${i})" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    const totalProductos = ventaProducts.length;
    const totalUnidades = ventaProducts.reduce((sum, vp) => sum + vp.cantidad, 0);
    const total = ventaProducts.reduce((sum, vp) => sum + vp.total, 0);

    document.getElementById('ventaTotalProductos').textContent = totalProductos;
    document.getElementById('ventaTotalUnidades').textContent = totalUnidades;
    document.getElementById('ventaTotal').textContent = '$' + formatPrice(total);
}

function removeVentaProduct(index) {
    ventaProducts.splice(index, 1);
    renderVentaProducts();
}

async function guardarVenta() {
    const nombre = document.getElementById('ventaNombre').value.trim();
    if (!nombre) {
        showToast('Ingresa un nombre para la compra', 'error');
        const hint = document.getElementById('ventaHint');
        hint.textContent = 'Ingresa un nombre para la compra';
        hint.style.display = 'block';
        return;
    }

    if (ventaProducts.length === 0) {
        showToast('Agrega al menos un producto', 'error');
        return;
    }

    const total = ventaProducts.reduce((sum, vp) => sum + vp.total, 0);

    try {
        await api('/ventas', {
            method: 'POST',
            body: JSON.stringify({
                nombre,
                productos: ventaProducts,
                total,
                totalProductos: ventaProducts.length,
                totalUnidades: ventaProducts.reduce((sum, vp) => sum + vp.cantidad, 0)
            })
        });

        // Reload products (stock updated on server)
        await loadProducts();
        await loadVentas();

        // Reset form
        ventaProducts = [];
        ventaSelectedProduct = null;
        document.getElementById('ventaNombre').value = '';
        document.getElementById('ventaHint').style.display = 'none';
        renderVentaProducts();
        updateVentasCount();

        showToast('Venta guardada correctamente', 'success');
    } catch (e) {
        showToast(e.message || 'Error al guardar venta', 'error');
    }
}

async function renderHistorialVentas() {
    await loadVentas();
    const container = document.getElementById('historialVentasContent');

    if (ventasData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #9ca3af;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <p><strong>No hay ventas guardadas</strong></p>
                <p>Las ventas que guardes aparecerán aquí</p>
            </div>`;
        return;
    }

    container.innerHTML = ventasData.map(v => {
        const fecha = new Date(v.fecha).toLocaleDateString('es-CO');
        const prods = v.productos || [];
        const productsHtml = prods.map(p => {
            const nombre = escapeHtml(p.nombre || p.name || p.nombreOriginal || 'Producto');
            const cantidad = typeof p.cantidad === 'number' ? p.cantidad : parseInt(p.cantidad, 10) || 1;
            return `<span>${cantidad} x ${nombre}</span>`;
        }).join(', ');
        return `
            <div class="historial-item">
                <div class="historial-item-info">
                    <h4>${escapeHtml(v.nombre)}</h4>
                    <p>${fecha} - ${v.totalProductos || prods.length} productos, ${v.totalUnidades || 0} unidades</p>
                    <div class="historial-item-products">${productsHtml}</div>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <span class="historial-item-total">$${formatPrice(v.total)}</span>
                    <div class="historial-item-actions">
                        <button class="btn-icon btn-delete" onclick="deleteVenta(${v.id})" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function deleteVenta(id) {
    try {
        await api(`/ventas/${id}`, { method: 'DELETE' });
        await loadVentas();
        updateVentasCount();
        renderHistorialVentas();
        showToast('Venta eliminada', 'success');
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}

// ========== WHATSAPP IMPORT ==========
function parseWhatsAppOrder(text) {
    const clean = text.replace(/\*/g, '').replace(/\r/g, '');

    const clienteMatch = clean.match(/Cliente:\s*([\s\S]*?)(?=Tel[eé]fono:|Direccion:|Dirección:|Notas:|---\s*PRODUCTOS\s*---|TOTAL:|$)/i);
    const telefonoMatch = clean.match(/Tel[eé]fono:\s*([\s\S]*?)(?=Direccion:|Dirección:|Notas:|---\s*PRODUCTOS\s*---|TOTAL:|$)/i);
    const direccionMatch = clean.match(/Direcci[oó]n:\s*([\s\S]*?)(?=Notas:|---\s*PRODUCTOS\s*---|TOTAL:|$)/i);
    const notasMatch = clean.match(/Notas:\s*([\s\S]*?)(?=---\s*PRODUCTOS\s*---|TOTAL:|$)/i);

    const cliente = clienteMatch ? clienteMatch[1].trim() : 'Sin nombre';
    const telefono = telefonoMatch ? telefonoMatch[1].trim() : '';
    const direccion = direccionMatch ? direccionMatch[1].trim() : '';
    const notas = notasMatch ? notasMatch[1].trim() : '';

    // Extract products section
    const productosSection = clean.split(/---\s*PRODUCTOS\s*---/i)[1] || '';
    const beforeTotal = productosSection.split(/TOTAL:/i)[0] || productosSection;
    const section = beforeTotal.replace(/\s+/g, ' ').trim();

    const products = [];
    const productRegex = /([^\n\r]*?)\s*Cantidad:\s*(\d+)\s*Precio:\s*\$?([\d.,]+)/gi;
    let match;
    while ((match = productRegex.exec(section)) !== null) {
        let nameChunk = (match[1] || '').trim();
        const idMatch = nameChunk.match(/\b(?:id|cod|codigo|sku|prod)\s*[:#-]?\s*(\d+)\b/i)
            || nameChunk.match(/#\s*(\d+)\b/);
        const productId = idMatch ? parseInt(idMatch[1], 10) : null;
        if (idMatch) {
            nameChunk = nameChunk.replace(idMatch[0], '').replace(/\s{2,}/g, ' ').trim();
        }
        const nameClean = nameChunk.replace(/^[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]+/g, '').trim();
        if (!nameClean && !productId) continue;

        const cantidad = parseInt(match[2], 10) || 1;
        const priceStr = match[3].replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
        const precio = parseFloat(priceStr) || 0;

        products.push({ productId, nombreOriginal: nameClean, cantidad, precio });
    }

    // Fallback to line-based parsing if regex didn't find products
    if (products.length === 0) {
        const lines = beforeTotal.split('\n').map(l => l.trim()).filter(l => l);
        let currentProduct = null;

        for (const line of lines) {
            const cantidadMatch = line.match(/^Cantidad:\s*(\d+)/i);
            const precioMatch = line.match(/^Precio:\s*\$?([\d.,]+)/i);

            if (cantidadMatch) {
                if (currentProduct) currentProduct.cantidad = parseInt(cantidadMatch[1], 10);
            } else if (precioMatch) {
                if (currentProduct) {
                    const priceStr = precioMatch[1].replace(/\./g, '').replace(',', '.');
                    currentProduct.precio = parseFloat(priceStr) || 0;
                    products.push(currentProduct);
                    currentProduct = null;
                }
            } else if (line && !line.match(/^(Gracias|TOTAL)/i)) {
                let nameChunk = line;
                const idMatch = nameChunk.match(/\b(?:id|cod|codigo|sku|prod)\s*[:#-]?\s*(\d+)\b/i)
                    || nameChunk.match(/#\s*(\d+)\b/);
                const productId = idMatch ? parseInt(idMatch[1], 10) : null;
                if (idMatch) {
                    nameChunk = nameChunk.replace(idMatch[0], '').replace(/\s{2,}/g, ' ').trim();
                }
                const nameClean = nameChunk.replace(/^[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ]+/g, '').trim();
                if (nameClean || productId) {
                    currentProduct = { productId, nombreOriginal: nameClean, cantidad: 1, precio: 0 };
                }
            }
        }
        if (currentProduct && currentProduct.precio > 0) products.push(currentProduct);
    }

    return { cliente, telefono, direccion, notas, products };
}

function matchWhatsAppProduct(waName) {
    const q = waName.toLowerCase().trim();
    let match = productsData.find(p => p.name.toLowerCase() === q);
    if (match) return match;
    match = productsData.find(p => p.name.toLowerCase().includes(q));
    if (match) return match;
    match = productsData.find(p => q.includes(p.name.toLowerCase()));
    if (match) return match;

    const words = q.split(/\s+/).filter(w => w.length > 2);
    let best = null, bestScore = 0;
    for (const p of productsData) {
        const pw = p.name.toLowerCase().split(/\s+/);
        const score = words.filter(w => pw.some(x => x.includes(w) || w.includes(x))).length;
        if (score > bestScore && score >= Math.min(2, words.length)) {
            bestScore = score;
            best = p;
        }
    }
    return best;
}

async function crearVentaDesdeWhatsApp() {
    const text = document.getElementById('waTextarea').value.trim();
    if (!text) {
        showToast('Pega un mensaje de WhatsApp primero', 'error');
        return;
    }

    if (productsData.length === 0) {
        await loadProducts();
    }

    const parsed = parseWhatsAppOrder(text);
    if (parsed.products.length === 0) {
        showToast('No se encontraron productos en el mensaje', 'error');
        return;
    }

    const nombre = 'WhatsApp - ' + parsed.cliente;
    ventaProducts = parsed.products.map(wp => {
        const match = (typeof wp.productId === 'number')
            ? productsData.find(p => p.id === wp.productId)
            : matchWhatsAppProduct(wp.nombreOriginal);
        const precioUnit = match ? (match.precioVenta || 0) : (wp.cantidad > 0 ? Math.round(wp.precio / wp.cantidad) : wp.precio);
        return {
            productId: match ? match.id : null,
            id: match ? match.id : null,
            nombre: match ? match.name : wp.nombreOriginal,
            precioUnit,
            precioVenta: precioUnit,
            cantidad: wp.cantidad,
            total: precioUnit * wp.cantidad
        };
    });

    ventaSelectedProduct = null;
    document.getElementById('ventaNombre').value = nombre;
    document.getElementById('ventaProductSearch').value = '';
    document.getElementById('ventaPrecio').value = '';
    document.getElementById('ventaStock').value = '';
    document.getElementById('ventaCantidad').value = 1;
    document.getElementById('ventaHint').style.display = 'none';

    renderVentaProducts();
    updateVentasCount();
    document.getElementById('waTextarea').value = '';
    showToast('Pedido cargado en el formulario. Revisa y guarda la venta.', 'success');
}

// ========== COMPRA MODULE ==========
function updateComprasCount() {
    document.getElementById('comprasCount').textContent = comprasData.length;
}

function searchProductsForCompra(query) {
    const results = document.getElementById('compraSearchResults');
    if (query.length < 2) {
        results.classList.remove('active');
        return;
    }

    const matches = productsData.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);

    if (matches.length === 0) {
        results.classList.remove('active');
        return;
    }

    results.innerHTML = matches.map(p => `
        <div class="search-result-item" onclick="selectCompraProduct(${p.id})">
            <span>${p.emoji || '📦'} ${escapeHtml(p.name)}</span>
            <span class="result-price">${escapeHtml(p.category)}</span>
        </div>
    `).join('');
    results.classList.add('active');
}

function selectCompraProduct(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    document.getElementById('compraProductName').value = product.name;
    document.getElementById('compraProductCat').value = product.category;
    document.getElementById('compraProductPrecio').value = product.precioCompra || 0;
    document.getElementById('compraProductCant').value = 1;
    document.getElementById('compraSearchResults').classList.remove('active');
}

function addCompraProduct() {
    const name = document.getElementById('compraProductName').value.trim();
    const cat = document.getElementById('compraProductCat').value.trim();
    const cant = parseInt(document.getElementById('compraProductCant').value) || 0;
    const precio = parseFloat(document.getElementById('compraProductPrecio').value) || 0;

    if (!name || cant <= 0 || precio <= 0) {
        showToast('Completa todos los campos del producto', 'error');
        return;
    }

    compraProducts.push({
        nombre: name,
        categoria: cat,
        cantidad: cant,
        precioUnit: precio,
        subtotal: cant * precio
    });

    document.getElementById('compraProductName').value = '';
    document.getElementById('compraProductCat').value = '';
    document.getElementById('compraProductCant').value = 0;
    document.getElementById('compraProductPrecio').value = 0;

    renderCompraProducts();
}

function renderCompraProducts() {
    const tbody = document.getElementById('compraProductsBody');
    const table = document.getElementById('compraProductsTable');
    const empty = document.getElementById('compraProductsEmpty');

    if (compraProducts.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
    } else {
        table.style.display = 'table';
        empty.style.display = 'none';

        tbody.innerHTML = compraProducts.map((cp, i) => `
            <tr>
                <td>${escapeHtml(cp.nombre)}</td>
                <td>${escapeHtml(cp.categoria)}</td>
                <td>${cp.cantidad}</td>
                <td>$${formatPrice(cp.precioUnit)}</td>
                <td class="profit-cell">$${formatPrice(cp.subtotal)}</td>
                <td>
                    <button class="btn-icon btn-delete" onclick="removeCompraProduct(${i})" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    const total = compraProducts.reduce((sum, cp) => sum + cp.subtotal, 0);
    document.getElementById('compraTotal').textContent = '$' + formatPrice(total);
}

function removeCompraProduct(index) {
    compraProducts.splice(index, 1);
    renderCompraProducts();
}

async function registrarCompra() {
    const proveedor = document.getElementById('compraProveedor').value.trim();
    const fecha = document.getElementById('compraFecha').value;
    const factura = document.getElementById('compraFactura').value.trim();
    const notas = document.getElementById('compraNotas').value.trim();

    if (!proveedor) {
        showToast('Ingresa el nombre del proveedor', 'error');
        return;
    }

    if (compraProducts.length === 0) {
        showToast('Agrega al menos un producto', 'error');
        return;
    }

    const total = compraProducts.reduce((sum, cp) => sum + cp.subtotal, 0);

    try {
        await api('/compras', {
            method: 'POST',
            body: JSON.stringify({ proveedor, fecha, factura, notas, productos: compraProducts, total })
        });

        await loadProducts();
        await loadCompras();

        // Reset form
        compraProducts = [];
        document.getElementById('compraProveedor').value = '';
        document.getElementById('compraFactura').value = '';
        document.getElementById('compraNotas').value = '';
        setDefaultDates();
        renderCompraProducts();
        updateComprasCount();

        showToast('Compra registrada correctamente', 'success');
    } catch (e) {
        showToast(e.message || 'Error al registrar compra', 'error');
    }
}

function cancelarCompra() {
    compraProducts = [];
    document.getElementById('compraProveedor').value = '';
    document.getElementById('compraFactura').value = '';
    document.getElementById('compraNotas').value = '';
    setDefaultDates();
    renderCompraProducts();
}

async function renderHistorialCompras() {
    await loadCompras();
    const container = document.getElementById('historialComprasContent');

    if (comprasData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #9ca3af;">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
                <p><strong>No hay compras registradas</strong></p>
                <p>Las compras que registres aparecerán aquí</p>
            </div>`;
        return;
    }

    container.innerHTML = comprasData.map(c => {
        const fecha = new Date(c.fecha).toLocaleDateString('es-CO');
        const prods = c.productos || [];
        return `
            <div class="historial-item">
                <div class="historial-item-info">
                    <h4>${escapeHtml(c.proveedor)}</h4>
                    <p>${fecha}${c.factura ? ' - ' + escapeHtml(c.factura) : ''} - ${prods.length} productos</p>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <span class="historial-item-total">$${formatPrice(c.total)}</span>
                    <div class="historial-item-actions">
                        <button class="btn-icon btn-delete" onclick="deleteCompra(${c.id})" title="Eliminar">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function deleteCompra(id) {
    try {
        await api(`/compras/${id}`, { method: 'DELETE' });
        await loadCompras();
        updateComprasCount();
        renderHistorialCompras();
        showToast('Compra eliminada', 'success');
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}

// ========== GASTOS MODULE ==========
function renderGastos() {
    const table = document.getElementById('gastosTable');
    const empty = document.getElementById('gastosEmpty');
    const tbody = document.getElementById('gastosTableBody');

    if (gastosData.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
    } else {
        table.style.display = 'table';
        empty.style.display = 'none';

        tbody.innerHTML = gastosData.map(g => {
            const fecha = new Date(g.fecha).toLocaleDateString('es-CO');
            return `
                <tr>
                    <td>${escapeHtml(g.descripcion)}</td>
                    <td>${escapeHtml(g.categoria)}</td>
                    <td class="profit-cell">$${formatPrice(g.monto)}</td>
                    <td>${fecha}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon btn-delete" onclick="deleteGasto(${g.id})" title="Eliminar">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function updateGastosStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const gastosMes = gastosData
        .filter(g => {
            const d = new Date(g.fecha);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, g) => sum + g.monto, 0);

    document.getElementById('gastosTotalMes').textContent = '$' + formatPrice(gastosMes);
    document.getElementById('gastosCantidad').textContent = gastosData.length;
}

function openGastoModal() {
    document.getElementById('gastoModalTitle').textContent = 'Agregar Gasto';
    document.getElementById('gastoForm').reset();
    document.getElementById('gastoFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('gastoModal').classList.add('active');
}

function closeGastoModal() {
    document.getElementById('gastoModal').classList.remove('active');
}

async function handleGastoSubmit(e) {
    e.preventDefault();

    const descripcion = document.getElementById('gastoDescripcion').value.trim();
    const categoria = document.getElementById('gastoCategoria').value;
    const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
    const fecha = document.getElementById('gastoFecha').value;

    if (!descripcion || monto <= 0) {
        showToast('Completa todos los campos requeridos', 'error');
        return;
    }

    try {
        await api('/gastos', {
            method: 'POST',
            body: JSON.stringify({ descripcion, categoria, monto, fecha: fecha || new Date().toISOString().split('T')[0] })
        });

        await loadGastos();
        renderGastos();
        updateGastosStats();
        closeGastoModal();
        showToast('Gasto registrado', 'success');
    } catch (e) {
        showToast(e.message || 'Error al registrar gasto', 'error');
    }
}

async function deleteGasto(id) {
    try {
        await api(`/gastos/${id}`, { method: 'DELETE' });
        await loadGastos();
        renderGastos();
        updateGastosStats();
        showToast('Gasto eliminado', 'success');
    } catch (e) {
        showToast(e.message || 'Error al eliminar', 'error');
    }
}

// ========== TOAST ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = `${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'} ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== UTILS ==========
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '0';
    return price.toLocaleString('es-CO');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        login(
            document.getElementById('loginUser').value.trim(),
            document.getElementById('loginPassword').value
        );
    });

    // Toggle password visibility
    document.getElementById('togglePassword').addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Back button
    document.getElementById('btnBack').addEventListener('click', () => navigateTo('dashboard'));

    // Module cards navigation
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => {
            const view = card.getAttribute('data-view');
            if (view) navigateTo(view);
        });
    });

    // Tabs
    document.querySelectorAll('.tabs').forEach(tabsContainer => {
        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                const parent = tab.closest('.view');

                tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                const targetId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');

                if (tabName === 'historialVentas') renderHistorialVentas();
                if (tabName === 'historialCompras') renderHistorialCompras();
            });
        });
    });

    // Inventory - Add product
    document.getElementById('addProductBtn').addEventListener('click', openAddModal);

    // Product modal
    document.getElementById('closeModal').addEventListener('click', closeProductModal);
    document.getElementById('cancelBtn').addEventListener('click', closeProductModal);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

    // Delete modal
    document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Venta
    document.getElementById('ventaProductSearch').addEventListener('input', (e) => {
        searchProductsForVenta(e.target.value);
    });
    document.getElementById('ventaAddProduct').addEventListener('click', addVentaProduct);
    document.getElementById('ventaGuardar').addEventListener('click', guardarVenta);
    document.getElementById('waCrearVenta').addEventListener('click', crearVentaDesdeWhatsApp);

    // Compra
    document.getElementById('compraProductName').addEventListener('input', (e) => {
        searchProductsForCompra(e.target.value);
    });
    document.getElementById('compraAddProduct').addEventListener('click', addCompraProduct);
    document.getElementById('compraRegistrar').addEventListener('click', registrarCompra);
    document.getElementById('compraCancelar').addEventListener('click', cancelarCompra);

    // Gastos
    document.getElementById('addGastoBtn').addEventListener('click', openGastoModal);
    document.getElementById('closeGastoModal').addEventListener('click', closeGastoModal);
    document.getElementById('cancelGastoBtn').addEventListener('click', closeGastoModal);
    document.getElementById('gastoForm').addEventListener('submit', handleGastoSubmit);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // Close with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#ventaProductSearch') && !e.target.closest('#ventaSearchResults')) {
            document.getElementById('ventaSearchResults').classList.remove('active');
        }
        if (!e.target.closest('#compraProductName') && !e.target.closest('#compraSearchResults')) {
            document.getElementById('compraSearchResults').classList.remove('active');
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
