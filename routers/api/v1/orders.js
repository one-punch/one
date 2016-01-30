var express = require('express');
var app = express.Router();
var models  = require(process.env.PWD + '/models')
var helpers = require(process.env.PWD + "/helpers")
var async = require("async")
var requireLogin = helpers.requireLogin

app.post("/flow/recharge/order", function(req, res) {
  var body = req.rawBody || req.body,
      phone = body.phone,
      product_id = body.product_id,
      callback_url = body.callback_url,
      user_order_id = body.user_order_id,
      client_id = body.client_id,
      sign = body.sign,
      access_token = body.access_token

  if(!(phone && product_id && sign && access_token)){
    res.json({
      errcode: 50001,
      errmsg: "access_token、sign、product_id或者phone参数有误",
    })
    return
  }

  async.waterfall([function(next){
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error("token失效"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next){
    var signParams = {
      callback_url: callback_url,
      client_id: client_id,
      phone: phone,
      user_order_id: user_order_id,
      product_id: product_id
    }
    var _sign = helpers.sign(signParams)
    if(_sign == sign){
      next(null, customer)
    }else{
      next(new Error("签名有误"))
    }
  }, function(customer, next) {
    models.Product.findById(product_id).then(function(product) {
      if(product){
        next(null, customer, product)
      }else{
        next(new Error("product_id参数有误"))
      }
    })
  }, function(customer, product, next) {
    product.getCoupons({
      order: [
        ["updatedAt", "DESC"]
      ]
    }).then(function(coupons) {
      product.coupon = coupons[0]
      next(null, customer, product, coupons[0])
    }).catch(function(err){
      next(err)
    })
  }, function(customer, product, coupon, next) {
    product.getTrafficPlan().then(function(trafficPlan) {
      product.trafficPlan = trafficPlan
      next(null, customer, product, coupon)
    }).catch(function(err) {
      next(err)
    })
  },function(customer, product, coupon, next) {
    customer.getLevel().then(function(level) {
      customer.level = level
      next(null, customer, product, coupon, level)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, product, coupon, level, next) {
    if(user_order_id){
      customer.getOrders({
        where: {
          userOrderId: user_order_id
        }
      }).then(function(orders) {
        if(orders[0]){
          next(new Error("用户重复订购，无法充值"))
        }else{
          next(null, customer, product, coupon, level)
        }
      }).catch(function(err) {
        next(err)
      })
    }else{
      next(null, customer, product, coupon, level)
    }
  },function(customer, product, coupon, level, next) {
    var total = helpers.discount(customer, product),
        trafficPlan = product.trafficPlan
    models.Order.build({
      exchangerType: product.className(),
      exchangerId: product.id,
      phone: phone,
      cost: trafficPlan["purchasePrice"],
      value: product.value,
      type: trafficPlan["type"],
      bid: trafficPlan["bid"],
      customerId: customer.id,
      total: total,
      transactionId: null,
      userOrderId: user_order_id,
      callbackUrl: decodeURIComponent(callback_url)
    }).save().then(function(order) {
      next(null, customer, product, order)
    }).catch(function(err){
      next(err)
    })
  }], function(err, customer, product, order){
    if(err){
      helpers.errRespone(err, res)
    }else{
      res.json({
        errcode: 0,
        errmsg: "success",
        order: {
          transaction_id: order.transactionId,
          phone: order.phone,
          product_id: order.exchangerId,
          total: order.total
        }
      })
    }
  })
})

app.get("/order/detail", function(req, res) {
  var access_token = req.query.access_token,
      sign = req.query.sign,
      order_id = req.query.order_id

  if(!(access_token && sign && order_id)){
    res.json({
      errcode: 50001,
      errmsg: "access_token、sign或者order_id",
    })
    return
  }

  async.waterfall([function(next) {
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error(""))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next) {
    var signParams = {
      order_id: order_id
    }
    var _sign = helpers.sign(signParams)
    if(_sign == sign){
      next(null, customer)
    }else{
      next(new Error("签名有误"))
    }
  }, function(customer, next) {
    models.Order.findOne({
      where: {
        customerId: customer.id,
        transactionId: order_id
      }
    }).then(function(order) {
      if(order){
        next(null, customer, order)
      }else{
        next(new Error("订单不存在"))
      }
    })
  }], function(err, customer, order) {
    if(err){
      helpers.errRespone(err, res)
    }else{
      res.json({
        errcode: 0,
        errmsg: "success",
        order: {
          transaction_id: order.transactionId,
          phone: order.phone,
          product_id: order.exchangerId,
          total: order.total,
          created_at: helpers.strftime(order.createdAt),
          state: order.state,
          state_name: order.stateName()
        }
      })
    }
  })
})

app.get("/order/lists", function(req, res) {
  var access_token = req.query.access_token,
      sign = req.query.sign,
      start_time = req.query.start_time,
      end_time = req.query.end_time,
      page = req.query.page || 1,
      perPage = 30

  if(!(access_token && sign && start_time && end_time && page)){
    res.json({
      errcode: 50001,
      errmsg: "access_token、sign、start_time、end_time或者page参数有误",
    })
    return
  }

  async.waterfall([function(next) {
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error("token失效"))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next) {
    var signParams = {
      start_time: start_time,
      end_time: end_time,
      page: page
    }
    var _sign = helpers.sign(signParams)
    if(_sign == sign){
      next(null, customer)
    }else{
      next(new Error("签名有误"))
    }
  }, function(customer, next){
    console.log(start_time)
    console.log(end_time)
    models.Order.findAndCountAll({
      where: {
        createdAt: {
          $gt: new Date(parseInt(start_time)),
          $lt: new Date(parseInt(end_time))
        }
      },
      limit: perPage,
      offset: helpers.offset(page, perPage)
    }).then(function(orders){
      next(null, customer, orders)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, orders, pass) {
    async.map(orders.rows, function(order, next) {
      next(null, {
        transaction_id: order.transactionId,
        phone: order.phone,
        product_id: order.exchangerId,
        total: order.total,
        created_at: helpers.strftime(order.createdAt),
        state: order.state,
        state_name: order.stateName()
      })
    }, function(err, ordersJson){
      if(err){
        pass(err)
      }else{
        pass(null, customer, orders, ordersJson)
      }
    })
  }], function(err, customer, orders, ordersJson){
    if(err){
      helpers.errRespone(err, res)
    }else{
      res.json({
        errcode: 0,
        errmsg: "success",
        orders: {
          total: orders.count,
          totalPage: (orders.count % perPage) == 0 ? (orders.count / perPage) : parseInt(orders.count / perPage) + 1,
          page: page,
          per_page: perPage,
          lists: ordersJson
        }
      })
    }
  })
})


module.exports = app;