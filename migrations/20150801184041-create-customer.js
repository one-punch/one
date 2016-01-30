'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Customers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        allowNull: false,
        type: Sequelize.STRING
      },
      phone: {
        allowNull: true,
        type: Sequelize.STRING
      },
      password_hash: {
        allowNull: false,
        type: Sequelize.STRING
      },
      client_id: {
        allowNull: false,
        type: Sequelize.STRING
      },
      client_secret: {
        allowNull: false,
        type: Sequelize.STRING
      },
      access_token: {
        allowNull: true,
        type: Sequelize.STRING
      },
      expires_in: {
        allowNull: true,
        type: Sequelize.DATE
      },
      salt: {
        allowNull: false,
        type: Sequelize.STRING
      },
      balance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      levelId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      orderTotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('Customers');
  }
};