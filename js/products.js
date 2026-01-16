// ============================================
// CATALOGO DE PRODUCTOS
// Modifica este archivo para agregar/editar tus productos
// ============================================

const products = [
    // --- CARNES PREPARADAS ---
    {
        id: 1,
        name: 'Carne para hamburguesa x4',
        description: 'Pack de 4 carnes de res premium listas para asar',
        price: 18000,
        category: 'Carnes Preparadas',
        emoji: '🍔'
    },
    {
        id: 2,
        name: 'Carne para hamburguesa x8',
        description: 'Pack de 8 carnes de res premium listas para asar',
        price: 32000,
        category: 'Carnes Preparadas',
        emoji: '🍔'
    },
    {
        id: 3,
        name: 'Albondigas de res x12',
        description: 'Deliciosas albondigas caseras de carne de res',
        price: 22000,
        category: 'Carnes Preparadas',
        emoji: '🧆'
    },
    {
        id: 4,
        name: 'Carne molida sazonada 500g',
        description: 'Carne molida lista para cocinar con especias',
        price: 15000,
        category: 'Carnes Preparadas',
        emoji: '🥩'
    },
    {
        id: 5,
        name: 'Chorizos artesanales x6',
        description: 'Chorizos caseros con receta tradicional',
        price: 20000,
        category: 'Carnes Preparadas',
        emoji: '🌭'
    },
    {
        id: 6,
        name: 'Pinchos de carne x8',
        description: 'Brochetas de carne marinada listas para asar',
        price: 25000,
        category: 'Carnes Preparadas',
        emoji: '🍢'
    },

    // --- POLLO ---
    {
        id: 7,
        name: 'Nuggets de pollo x20',
        description: 'Nuggets crujientes de pollo empanizados',
        price: 18000,
        category: 'Pollo',
        emoji: '🍗'
    },
    {
        id: 8,
        name: 'Milanesas de pollo x4',
        description: 'Pechugas empanizadas listas para freir',
        price: 22000,
        category: 'Pollo',
        emoji: '🍗'
    },
    {
        id: 9,
        name: 'Alitas BBQ x12',
        description: 'Alitas marinadas en salsa BBQ',
        price: 24000,
        category: 'Pollo',
        emoji: '🍗'
    },
    {
        id: 10,
        name: 'Pinchos de pollo x8',
        description: 'Brochetas de pollo marinado',
        price: 20000,
        category: 'Pollo',
        emoji: '🍢'
    },
    {
        id: 11,
        name: 'Pollo apanado familiar',
        description: 'Presas de pollo empanizadas para toda la familia',
        price: 35000,
        category: 'Pollo',
        emoji: '🍗'
    },

    // --- EMPANADAS Y PASTELITOS ---
    {
        id: 12,
        name: 'Empanadas de carne x10',
        description: 'Empanadas criollas rellenas de carne molida',
        price: 15000,
        category: 'Empanadas y Pastelitos',
        emoji: '🥟'
    },
    {
        id: 13,
        name: 'Empanadas de pollo x10',
        description: 'Empanadas rellenas de pollo desmechado',
        price: 15000,
        category: 'Empanadas y Pastelitos',
        emoji: '🥟'
    },
    {
        id: 14,
        name: 'Empanadas mixtas x10',
        description: '5 de carne + 5 de pollo',
        price: 15000,
        category: 'Empanadas y Pastelitos',
        emoji: '🥟'
    },
    {
        id: 15,
        name: 'Pastelitos de queso x8',
        description: 'Pastelitos horneados rellenos de queso',
        price: 12000,
        category: 'Empanadas y Pastelitos',
        emoji: '🥧'
    },
    {
        id: 16,
        name: 'Pastelitos de pollo x8',
        description: 'Pastelitos horneados rellenos de pollo',
        price: 14000,
        category: 'Empanadas y Pastelitos',
        emoji: '🥧'
    },
    {
        id: 17,
        name: 'Deditos de queso x12',
        description: 'Deditos crujientes rellenos de queso',
        price: 10000,
        category: 'Empanadas y Pastelitos',
        emoji: '🧀'
    },

    // --- PAPAS Y ACOMPANANTES ---
    {
        id: 18,
        name: 'Papas a la francesa 1kg',
        description: 'Papas precocidas listas para freir',
        price: 12000,
        category: 'Papas y Acompanantes',
        emoji: '🍟'
    },
    {
        id: 19,
        name: 'Papas gajo 1kg',
        description: 'Papas en gajo sazonadas',
        price: 14000,
        category: 'Papas y Acompanantes',
        emoji: '🥔'
    },
    {
        id: 20,
        name: 'Aros de cebolla x20',
        description: 'Aros de cebolla empanizados',
        price: 10000,
        category: 'Papas y Acompanantes',
        emoji: '🧅'
    },
    {
        id: 21,
        name: 'Yuca precocida 500g',
        description: 'Yuca lista para freir',
        price: 8000,
        category: 'Papas y Acompanantes',
        emoji: '🥔'
    },
    {
        id: 22,
        name: 'Platano maduro tajado 500g',
        description: 'Tajadas de platano maduro',
        price: 7000,
        category: 'Papas y Acompanantes',
        emoji: '🍌'
    },

    // --- SALSAS Y ADEREZOS ---
    {
        id: 23,
        name: 'Salsa BBQ casera 250ml',
        description: 'Salsa barbecue con receta secreta',
        price: 8000,
        category: 'Salsas y Aderezos',
        emoji: '🍯'
    },
    {
        id: 24,
        name: 'Salsa de ajo 250ml',
        description: 'Salsa cremosa de ajo',
        price: 7000,
        category: 'Salsas y Aderezos',
        emoji: '🧄'
    },
    {
        id: 25,
        name: 'Guacamole fresco 200g',
        description: 'Guacamole recien preparado',
        price: 10000,
        category: 'Salsas y Aderezos',
        emoji: '🥑'
    },
    {
        id: 26,
        name: 'Salsa rosada 250ml',
        description: 'Mezcla de mayonesa y ketchup especial',
        price: 6000,
        category: 'Salsas y Aderezos',
        emoji: '🥫'
    },
    {
        id: 27,
        name: 'Chimichurri 200ml',
        description: 'Chimichurri argentino tradicional',
        price: 9000,
        category: 'Salsas y Aderezos',
        emoji: '🌿'
    },

    // --- COMBOS ---
    {
        id: 28,
        name: 'Combo Parrillero Pequeno',
        description: 'Chorizos x4 + Carne hamburguesa x4 + Papas 500g',
        price: 38000,
        category: 'Combos',
        emoji: '🔥'
    },
    {
        id: 29,
        name: 'Combo Parrillero Grande',
        description: 'Chorizos x6 + Carne x8 + Alitas x12 + Papas 1kg',
        price: 75000,
        category: 'Combos',
        emoji: '🔥'
    },
    {
        id: 30,
        name: 'Combo Familiar',
        description: 'Empanadas x20 + Deditos x12 + Nuggets x20',
        price: 45000,
        category: 'Combos',
        emoji: '👨‍👩‍👧‍👦'
    },
    {
        id: 31,
        name: 'Combo Fiesta',
        description: 'Empanadas x30 + Pastelitos x20 + Deditos x20 + Salsas',
        price: 65000,
        category: 'Combos',
        emoji: '🎉'
    },
    {
        id: 32,
        name: 'Combo Pollo Crujiente',
        description: 'Nuggets x20 + Milanesas x4 + Papas 1kg + Salsa BBQ',
        price: 52000,
        category: 'Combos',
        emoji: '🍗'
    },

    // --- POSTRES ---
    {
        id: 33,
        name: 'Churros rellenos x6',
        description: 'Churros con arequipe o chocolate',
        price: 12000,
        category: 'Postres',
        emoji: '🥖'
    },
    {
        id: 34,
        name: 'Buenuelos x8',
        description: 'Bunuelos de queso tradicionales',
        price: 10000,
        category: 'Postres',
        emoji: '🧁'
    },
    {
        id: 35,
        name: 'Torta de chocolate porcion',
        description: 'Deliciosa torta de chocolate casera',
        price: 8000,
        category: 'Postres',
        emoji: '🍫'
    },

    // --- BEBIDAS ---
    {
        id: 36,
        name: 'Limonada natural 1L',
        description: 'Limonada casera recien exprimida',
        price: 8000,
        category: 'Bebidas',
        emoji: '🍋'
    },
    {
        id: 37,
        name: 'Jugo de lulo 1L',
        description: 'Jugo natural de lulo',
        price: 10000,
        category: 'Bebidas',
        emoji: '🥤'
    },
    {
        id: 38,
        name: 'Jugo de maracuya 1L',
        description: 'Jugo natural de maracuya',
        price: 10000,
        category: 'Bebidas',
        emoji: '🥤'
    },
    {
        id: 39,
        name: 'Gaseosa 2.5L',
        description: 'Coca-Cola, Sprite o Fanta',
        price: 7000,
        category: 'Bebidas',
        emoji: '🥤'
    },
    {
        id: 40,
        name: 'Agua botella 600ml',
        description: 'Agua cristal',
        price: 2500,
        category: 'Bebidas',
        emoji: '💧'
    }
];
