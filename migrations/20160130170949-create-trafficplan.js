'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('TrafficPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      providerId: { type: Sequelize.INTEGER, allowNull: false },
      value: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      name: { type: Sequelize.STRING, allowNull: false },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      sortNum: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      display: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      type: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      bid: { type: Sequelize.STRING, allowNull: true },
      purchasePrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
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
    return queryInterface.dropTable('TrafficPlans');
  }
};