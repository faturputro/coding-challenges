'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // hash() generates the salt itself when given the cost factor.
    const hash = await bcrypt.hash('Password@123,', 10);

    await queryInterface.bulkInsert('admin', [
      {
        email: 'admin@mail.com',
        password: hash,
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('admin', { email: 'admin@mail.com' });
  }
};
