'use strict';
module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      state: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      exchangerType: { type: Sequelize.STRING, allowNull: false },
      exchangerId: { type: Sequelize.INTEGER, allowNull: false },
      phone: {  type: Sequelize.STRING, allowNull: true },
      cost: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0.0 },
      value: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      type: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      bid: { type: Sequelize.STRING, allowNull: true },
      customerId: { type: Sequelize.INTEGER, allowNull: true },
      chargeType: { type: Sequelize.STRING, allowNull: false, defaultValue: "balance" },
      transactionId: { type: Sequelize.STRING },
      paymentMethodId: { type: Sequelize.INTEGER },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0.0 },
      taskid: { type: Sequelize.STRING, allowNull: true },
      callbackUrl: { type: Sequelize.STRING, allowNull: true },
      userOrderId: { type: Sequelize.STRING, allowNull: true},
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
    return queryInterface.dropTable('Orders');
  }
};