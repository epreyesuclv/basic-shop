'use strict';

const { DataTypes, Sequelize } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        const hasTable = async (table) => {
            try {
                await queryInterface.describeTable(table);
                return true;
            } catch (err) {
                return false;
            }
        };

        if (!(await hasTable('users'))) {
            await queryInterface.createTable('users', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                username: { type: DataTypes.TEXT, allowNull: false, unique: true },
                password_hash: { type: DataTypes.TEXT, allowNull: false },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
            });
        }

        if (!(await hasTable('sessions'))) {
            await queryInterface.createTable('sessions', {
                token: { type: DataTypes.TEXT, primaryKey: true },
                user_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: { model: 'users', key: 'id' }
                },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
            });
        }

        if (!(await hasTable('products'))) {
            await queryInterface.createTable('products', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                name: { type: DataTypes.TEXT, allowNull: false },
                emoji: { type: DataTypes.TEXT, allowNull: false, defaultValue: '📦' },
                category: { type: DataTypes.TEXT, allowNull: false },
                precioCompra: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
                precioVenta: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
                cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                vendido: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' }
            });
        }

        if (!(await hasTable('ventas'))) {
            await queryInterface.createTable('ventas', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                nombre: { type: DataTypes.TEXT, allowNull: false },
                productos_json: { type: DataTypes.TEXT, allowNull: false },
                total: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
                fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
                totalProductos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                totalUnidades: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
            });
        }

        if (!(await hasTable('compras'))) {
            await queryInterface.createTable('compras', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                proveedor: { type: DataTypes.TEXT, allowNull: false },
                fecha: { type: DataTypes.TEXT, allowNull: false },
                factura: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
                notas: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
                productos_json: { type: DataTypes.TEXT, allowNull: false },
                total: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }
            });
        }

        if (!(await hasTable('gastos'))) {
            await queryInterface.createTable('gastos', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                descripcion: { type: DataTypes.TEXT, allowNull: false },
                categoria: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'Otros' },
                monto: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
                fecha: { type: DataTypes.TEXT, allowNull: false }
            });
        }
    },

    async down({ context: queryInterface }) {
        await queryInterface.dropTable('gastos');
        await queryInterface.dropTable('compras');
        await queryInterface.dropTable('ventas');
        await queryInterface.dropTable('products');
        await queryInterface.dropTable('sessions');
        await queryInterface.dropTable('users');
    }
};
