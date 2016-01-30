'use strict';
module.exports = function(sequelize, DataTypes) {
  var Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    sortNum: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    display: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    trafficPlanId: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.Product.hasMany(models.Coupon, { foreignKey: 'productId' })
        models.Product.belongsTo(models.TrafficPlan, { foreignKey: 'trafficPlanId' })
      }
    },
    instanceMethods: {
      className: function(){
        return "Product"
      },
      provider: function(){
        return Product.ProviderName[this.providerId]
      },
      typeJson: function(){
        return Product.TYPE;
      }
    }
  });

  Product.Provider = {
    '中国移动': 0,
    '中国联通': 1,
    '中国电信': 2
  }

  Product.ProviderName = {
    0: '中国移动',
    1: '中国联通',
    2: '中国电信'
  }

  Product.TYPE = {
    '非正式': 0,
    '空中平台': 1,
    '华沃红包': 2,
    '华沃广东': 3,
    '华沃全国': 4,
    '曦和流量': 5
  }

  Product.PROVIDERARRAY = Object.keys(Product.Provider).map(function(k) { return [Product.Provider[k], k] });

  Product.TYPEARRAY = Object.keys(Product.TYPE).map(function(k) { return [Product.TYPE[k], k] });

  return Product;
};