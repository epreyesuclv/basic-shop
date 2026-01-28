'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        const table = await queryInterface.describeTable('products');
        if (!table.image) {
            await queryInterface.addColumn('products', 'image', {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: ''
            });
        }
    },

    async down({ context: queryInterface }) {
        await queryInterface.removeColumn('products', 'image');
    }
};
