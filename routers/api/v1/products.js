var express = require('express');
var app = express.Router();
var models  = require(process.env.PWD + '/models')
var helpers = require(process.env.PWD + "/helpers")
var async = require("async")
var requireLogin = helpers.requireLogin


app.get("/product/lists", function(req, res) {
  var access_token = req.query.access_token

  if(!access_token) {
    helpers.errRespone(new Error(50012), res)
    return
  }

  async.waterfall([function(next) {
    models.Customer.validateToken(models, access_token).then(function(customer) {
      if(customer){
        next(null, customer)
      }else{
        next(new Error(50009))
      }
    }).catch(function(err){
      next(err)
    })
  }, function(customer, next) {
    models.Product.findAll({
      where: {
        display: true
      },
      order: [
        'sortNum'
      ]
    }).then(function(products) {
      next(null, customer, products)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, products, pass) {

    async.map(products, function(product, next) {
      next(null, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        flow_value: product.value,
        provider_id: product.providerId
      })
    }, function(err, productsJson){
      pass(null, customer, productsJson)
    })
  }], function(err, customer, productsJson){
    if(err){
      helpers.errRespone(err, res)
    }else{
      res.json({
        errcode: 0,
        errmsg: "success",
        products: productsJson
      })
    }
  })

})


module.exports = app;