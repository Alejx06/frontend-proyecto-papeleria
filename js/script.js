// ==================== CONEXIÓN AL BACKEND ====================
const API_URL = 'http://localhost:8080/api/productos';

let productos = [];

// ==================== VARIABLES GLOBALES ====================
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let currentFilter = 'todos';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarProductosDesdeBackend();
    actualizarCarrito();
    configurarEventos();
});

// ==================== CARGAR DESDE BACKEND ====================
async function cargarProductosDesdeBackend() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al conectar con el backend');

        const datos = await response.json();

        productos = datos
            .filter(p => p.activo)
            .map(p => ({
                id: p.id,
                nombre: p.nombre,
                categoria: (p.categoria || 'otros').toLowerCase(),
                precio: p.precio,
                descripcion: p.descripcion || '',
                stock: p.stock,
                icono: obtenerIcono(p.categoria)
            }));

        renderizarProductos(productos);

    } catch (error) {
        console.warn('Backend no disponible, usando datos de ejemplo:', error);
        productos = [
            { id: 1, nombre: "Cuaderno A4 Rayas", categoria: "cuadernos", precio: 4.99, descripcion: "Cuaderno de 100 hojas rayadas", icono: "📓", stock: 10 },
            { id: 2, nombre: "Lápiz HB", categoria: "boligrafos", precio: 1.20, descripcion: "Lápiz grafito", icono: "✏️", stock: 50 },
            { id: 3, nombre: "Papel A4 (resma 500)", categoria: "papeles", precio: 7.99, descripcion: "Resma de 500 hojas A4", icono: "📄", stock: 20 },
            { id: 4, nombre: "Marcadores de colores", categoria: "marcadores", precio: 8.99, descripcion: "Pack 12 marcadores", icono: "🖍️", stock: 15 }
        ];
        renderizarProductos(productos);
        mostrarNotificacion('Mostrando productos de ejemplo (backend desconectado)');
    }
}

function obtenerIcono(categoria) {
    const iconos = {
        'cuadernos': '📓',
        'papeles': '📄',
        'boligrafos': '🖊️',
        'lapices': '✏️',
        'marcadores': '🖍️',
        'utiles': '✂️'
    };
    return iconos[(categoria || '').toLowerCase()] || '📦';
}

// ==================== FUNCIONES DE PRODUCTOS ====================
function renderizarProductos(productosAMostrar) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';

    productosAMostrar.forEach(producto => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                ${producto.icono}
            </div>
            <div class="product-info">
                <p class="product-category">${producto.categoria.toUpperCase()}</p>
                <h3 class="product-name">${producto.nombre}</h3>
                <p class="product-description">${producto.descripcion}</p>
                <p class="product-price">$${producto.precio.toFixed(2)}</p>
                <div class="product-bottom">
                    <input type="number" class="quantity-input" value="1" min="1" max="99">
                    <button class="add-to-cart-btn" onclick="agregarAlCarrito(${producto.id})">
                        Agregar
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

function filterProducts(categoria) {
    currentFilter = categoria;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    if (categoria === 'todos') {
        renderizarProductos(productos);
    } else {
        renderizarProductos(productos.filter(p => p.categoria === categoria));
    }
}

// ==================== FUNCIONES DEL CARRITO ====================
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    const quantityInput = event.target.parentElement.querySelector('.quantity-input');
    const cantidad = parseInt(quantityInput.value);

    if (cantidad <= 0) { alert('Por favor ingresa una cantidad válida'); return; }

    const itemCarrito = carrito.find(item => item.id === productoId);
    if (itemCarrito) {
        itemCarrito.cantidad += cantidad;
    } else {
        carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: cantidad, icono: producto.icono });
    }

    guardarCarrito();
    actualizarCarrito();
    mostrarNotificacion('Producto agregado al carrito');
    quantityInput.value = 1;
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    guardarCarrito();
    actualizarCarrito();
}

function actualizarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(i => i.id === productoId);
    if (item) {
        if (nuevaCantidad <= 0) { eliminarDelCarrito(productoId); }
        else { item.cantidad = nuevaCantidad; guardarCarrito(); actualizarCarrito(); }
    }
}

function actualizarCarrito() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCount.textContent = totalItems;

    if (carrito.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Tu carrito está vacío</div>';
    } else {
        cartItems.innerHTML = carrito.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.icono} ${item.nombre}</h4>
                    <p>Cantidad: <input type="number" value="${item.cantidad}" min="1" max="99"
                        onchange="actualizarCantidad(${item.id}, this.value)" style="width: 50px;"></p>
                </div>
                <div>
                    <p class="cart-item-price">$${(item.precio * item.cantidad).toFixed(2)}</p>
                    <button class="remove-item" onclick="eliminarDelCarrito(${item.id})">Eliminar</button>
                </div>
            </div>
        `).join('');
    }

    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const impuesto = subtotal * 0.16;
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${impuesto.toFixed(2)}`;
    document.getElementById('total').textContent = `$${(subtotal + impuesto).toFixed(2)}`;
}

function guardarCarrito() { localStorage.setItem('carrito', JSON.stringify(carrito)); }

function checkout() {
    if (carrito.length === 0) { alert('Tu carrito está vacío'); return; }
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalFinal = total * 1.16;
    if (confirm(`Total de tu compra: $${totalFinal.toFixed(2)}\n\n¿Deseas proceder con el pago?`)) {
        mostrarNotificacion('¡Compra realizada exitosamente!');
        carrito = []; guardarCarrito(); actualizarCarrito(); closeCart();
    }
}

// ==================== MODAL ====================
const modal = document.getElementById('cart-modal');
const cartBtn = document.getElementById('cart-btn');
const closeBtn = document.querySelector('.close');
cartBtn.addEventListener('click', openCart);
closeBtn.addEventListener('click', closeCart);
window.addEventListener('click', function(event) { if (event.target === modal) closeCart(); });
function openCart() { modal.classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeCart() { modal.classList.remove('show'); document.body.style.overflow = 'auto'; }

// ==================== FORMULARIO DE CONTACTO ====================
function configurarEventos() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            this.querySelectorAll('input, textarea').forEach(input => input.value = '');
            mostrarNotificacion('¡Mensaje enviado exitosamente!');
        });
    }
    const hamburger = document.getElementById('hamburger');
    if (hamburger) hamburger.addEventListener('click', toggleMenu);
}

function toggleMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu.style.display === 'flex') {
        navMenu.style.display = 'none';
    } else {
        navMenu.style.display = 'flex';
        navMenu.style.flexDirection = 'column';
        navMenu.style.position = 'absolute';
        navMenu.style.top = '60px';
        navMenu.style.left = '0';
        navMenu.style.right = '0';
        navMenu.style.backgroundColor = 'var(--primary-color)';
        navMenu.style.zIndex = '999';
    }
}

// ==================== NOTIFICACIONES ====================
function mostrarNotificacion(mensaje) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:80px;right:20px;background:var(--success-color);color:white;padding:15px 20px;border-radius:5px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:3000;`;
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ==================== BÚSQUEDA ====================
function buscarProductos(termino) {
    const t = termino.toLowerCase();
    renderizarProductos(productos.filter(p => p.nombre.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t)));
}

window.addEventListener('storage', function(e) {
    if (e.key === 'carrito') { carrito = JSON.parse(e.newValue) || []; actualizarCarrito(); }
});