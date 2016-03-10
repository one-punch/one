'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Orders',
      'trafficPlanId',
      {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Orders', 'trafficPlanId')
  }
};
