const express = require('express');
require('dotenv').config();
const { Pool } = require('pg');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname)));

// Serve admin panel at /admin (Railway deploy expects a clean path)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ========== DATABASE ==========
const isProduction = process.env.NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL || '';
const shouldSeed = process.env.SEED_DB ? process.env.SEED_DB === 'true' : !isProduction;

if (!DATABASE_URL && isProduction) {
    throw new Error('DATABASE_URL is required in production. Configure a persistent Postgres instance.');
}

const pool = new Pool({
    connectionString: DATABASE_URL || 'postgresql://localhost:5432/basic_shop',
    ssl: DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
    return pool.query(text, params);
}

async function runMigrations() {
    const sequelize = new Sequelize(DATABASE_URL || 'postgresql://localhost:5432/basic_shop', {
        dialect: 'postgres',
        logging: false,
        dialectOptions: DATABASE_URL ? { ssl: { rejectUnauthorized: false } } : {}
    });

    const migrationsGlob = path.join(__dirname, 'migrations', '*.js').replace(/\\/g, '/');
    const umzug = new Umzug({
        migrations: { glob: migrationsGlob },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: console
    });

    await umzug.up();
    await sequelize.close();
}

// ========== PUBLIC PRODUCTS (STORE FRONT) ==========
app.get('/api/public/products', async (req, res) => {
    try {
        const { rows } = await query(
            'SELECT id, name, emoji, category, description, image, "precioVenta" FROM products ORDER BY id'
        );
        const payload = rows.map(p => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            category: p.category,
            description: p.description || '',
            price: p.precioVenta || 0,
            image: p.image || ''
        }));
        res.json(payload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

async function initDatabase() {
    if (shouldSeed) {
        // Create default admin user if none exists
        const { rows } = await query('SELECT COUNT(*) as count FROM users');
        if (parseInt(rows[0].count) === 0) {
            const hash = bcrypt.hashSync('admin123', 10);
            await query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['admin', hash]);
            console.log('Default admin user created (admin / admin123)');
        }

        // Seed products if empty
        const prodCount = await query('SELECT COUNT(*) as count FROM products');
        if (parseInt(prodCount.rows[0].count) === 0) {
            await seedProducts();
        }
    }
}

async function seedProducts() {
    const defaultProducts = [
        
    ];

    for (const p of defaultProducts) {
        await query(
            `INSERT INTO products (name, emoji, category, "precioCompra", "precioVenta", cantidad, vendido, image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [p.name, p.emoji, p.category, Math.round(p.price * 0.6), p.price, 50, 0, '']
        );
    }
    console.log(`Seeded ${defaultProducts.length} products`);
}

// ========== AUTH MIDDLEWARE ==========
async function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { rows } = await query(
        'SELECT s.*, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1',
        [token]
    );
    if (rows.length === 0) {
        return res.status(401).json({ error: 'Sesión inválida' });
    }

    req.user = { id: rows[0].user_id, username: rows[0].username };
    next();
}

// ========== AUTH ROUTES ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password_hash)) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrecta' });
        }

        const user = rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        await query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, user.id]);

        // Clean old sessions (keep last 10)
        await query(`
            DELETE FROM sessions WHERE user_id = $1 AND token NOT IN (
                SELECT token FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10
            )
        `, [user.id]);

        res.json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/logout', authenticate, async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ ok: true });
});

app.get('/api/auth/check', authenticate, (req, res) => {
    res.json({ username: req.user.username });
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (!bcrypt.compareSync(currentPassword, rows[0].password_hash)) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

        // Invalidate all other sessions
        const currentToken = req.headers.authorization?.replace('Bearer ', '');
        await query('DELETE FROM sessions WHERE user_id = $1 AND token != $2', [req.user.id, currentToken]);

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== PRODUCTS ROUTES ==========
app.get('/api/products', authenticate, async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM products ORDER BY id');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/products', authenticate, async (req, res) => {
    try {
        const { name, emoji, category, precioCompra, precioVenta, cantidad, vendido, image } = req.body;

        if (!name || !category || !precioVenta) {
            return res.status(400).json({ error: 'Nombre, categoría y precio de venta son requeridos' });
        }

        const { rows } = await query(
            `INSERT INTO products (name, emoji, category, "precioCompra", "precioVenta", cantidad, vendido, image)\r\n             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, emoji || '📦', category, precioCompra || 0, precioVenta, cantidad || 0, vendido || 0, image || '']
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.put('/api/products/:id', authenticate, async (req, res) => {
    try {
        const { name, emoji, category, precioCompra, precioVenta, cantidad, vendido, image } = req.body;
        const { id } = req.params;

        const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const ex = existing.rows[0];

        const { rows } = await query(
            `UPDATE products SET name = $1, emoji = $2, category = $3, "precioCompra" = $4,\r\n             "precioVenta" = $5, cantidad = $6, vendido = $7, image = $8 WHERE id = $9 RETURNING *`,
            [name || ex.name, emoji || ex.emoji, category || ex.category, precioCompra ?? ex.precioCompra, precioVenta ?? ex.precioVenta, cantidad ?? ex.cantidad, vendido ?? ex.vendido, image ?? ex.image, id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
    try {
        const result = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== VENTAS ROUTES ==========
app.get('/api/ventas', authenticate, async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM ventas ORDER BY id DESC');
        res.json(rows.map(v => ({ ...v, productos: JSON.parse(v.productos_json) })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/ventas', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { nombre, productos } = req.body;

        if (!nombre || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Nombre y productos son requeridos' });
        }

        const total = productos.reduce((sum, p) => sum + (p.precioVenta * p.cantidad), 0);
        const totalProductos = productos.length;
        const totalUnidades = productos.reduce((sum, p) => sum + p.cantidad, 0);

        await client.query('BEGIN');

        for (const p of productos) {
            const pid = p.productId || p.id;
            if (pid) {
                await client.query(
                    'UPDATE products SET vendido = vendido + $1, cantidad = GREATEST(0, cantidad - $1) WHERE id = $2',
                    [p.cantidad, pid]
                );
            }
        }

        const { rows } = await client.query(
            `INSERT INTO ventas (nombre, productos_json, total, fecha, "totalProductos", "totalUnidades")
             VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *`,
            [nombre, JSON.stringify(productos), total, totalProductos, totalUnidades]
        );

        await client.query('COMMIT');
        res.json({ ...rows[0], productos: JSON.parse(rows[0].productos_json) });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    } finally {
        client.release();
    }
});

app.delete('/api/ventas/:id', authenticate, async (req, res) => {
    try {
        const result = await query('DELETE FROM ventas WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== COMPRAS ROUTES ==========
app.get('/api/compras', authenticate, async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM compras ORDER BY id DESC');
        res.json(rows.map(c => ({ ...c, productos: JSON.parse(c.productos_json) })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/compras', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { proveedor, fecha, factura, notas, productos } = req.body;

        if (!proveedor || !productos || productos.length === 0) {
            return res.status(400).json({ error: 'Proveedor y productos son requeridos' });
        }

        const total = productos.reduce((sum, p) => sum + ((p.precioUnit || 0) * (p.cantidad || 0)), 0);

        await client.query('BEGIN');

        for (const cp of productos) {
            const found = await client.query(
                'SELECT * FROM products WHERE LOWER(name) = LOWER($1)', [cp.nombre]
            );
            if (found.rows.length > 0) {
                await client.query(
                    'UPDATE products SET cantidad = cantidad + $1, "precioCompra" = $2 WHERE id = $3',
                    [cp.cantidad, cp.precioUnit, found.rows[0].id]
                );
            }
        }

        const { rows } = await client.query(
            `INSERT INTO compras (proveedor, fecha, factura, notas, productos_json, total)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [proveedor, fecha, factura || '', notas || '', JSON.stringify(productos), total]
        );

        await client.query('COMMIT');
        res.json({ ...rows[0], productos: JSON.parse(rows[0].productos_json) });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    } finally {
        client.release();
    }
});

app.delete('/api/compras/:id', authenticate, async (req, res) => {
    try {
        const result = await query('DELETE FROM compras WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Compra no encontrada' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== GASTOS ROUTES ==========
app.get('/api/gastos', authenticate, async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM gastos ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/gastos', authenticate, async (req, res) => {
    try {
        const { descripcion, categoria, monto, fecha } = req.body;

        if (!descripcion || !monto || monto <= 0) {
            return res.status(400).json({ error: 'Descripción y monto son requeridos' });
        }

        const { rows } = await query(
            `INSERT INTO gastos (descripcion, categoria, monto, fecha)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [descripcion, categoria || 'Otros', monto, fecha || new Date().toISOString().split('T')[0]]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.delete('/api/gastos/:id', authenticate, async (req, res) => {
    try {
        const result = await query('DELETE FROM gastos WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== DASHBOARD ROUTE ==========
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        const totalProducts = (await query('SELECT COUNT(*) as count FROM products')).rows[0].count;

        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

        const ventasMes = (await query(
            'SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE fecha >= $1 AND fecha < $2',
            [monthStart, monthEnd]
        )).rows[0].total;

        const gastosMes = (await query(
            'SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE fecha >= $1 AND fecha < $2',
            [monthStart, monthEnd]
        )).rows[0].total;

        res.json({ totalProducts: parseInt(totalProducts), ventasMes: parseFloat(ventasMes), gastosMes: parseFloat(gastosMes) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// ========== START ==========
runMigrations()
    .then(initDatabase)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
            console.log(`Store: http://localhost:${PORT}/index.html`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize database or migrations:', err.message);
        process.exit(1);
    });


