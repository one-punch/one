var express = require('express');
var app = express.Router();
var models  = require(process.env.PWD + '/models')
var helpers = require(process.env.PWD + "/helpers")
var async = require("async")
var requireLogin = helpers.requireLogin
var request = require("request")

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
    helpers.errRespone(new Error(50003), res)
    return
  }

  async.waterfall([function(next){
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error(50004))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(customer, next){
    var signParams = {
      client_id: client_id,
      phone: phone,
      product_id: product_id
    }
    if(callback_url){
      signParams["callback_url"] = callback_url
    }
    if(user_order_id){
      signParams["user_order_id"] = user_order_id
    }
    var _sign = helpers.sign(signParams)
    if(_sign == sign){
      next(null, customer)
    }else{
      next(new Error(50005))
    }
  }, function(customer, next) {
    models.Product.findById(product_id).then(function(product) {
      if(product){
        next(null, customer, product)
      }else{
        next(new Error(50006))
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
        if(customer.username != "test" && orders[0]){
          next(new Error(50007))
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
    if(customer.username == "test"){
      next(null, customer, null, {
        transactionId: "201601310020311",
        phone: phone,
        product_id: "12",
        total: 1.00
      }, null)
      return
    }

    var total = helpers.discount(customer, product),
        trafficPlan = product.trafficPlan
    if(customer.total < total){
      next(new Error(50008))
      return
    }
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
      callbackUrl: decodeURIComponent(callback_url),
      trafficPlanId: trafficPlan.id
    }).save().then(function(order) {
      customer.updateAttributes({
        total: customer.total - order.total
      }).then(function(customer){
        next(null, customer, product, order, trafficPlan)
      }).catch(function(err){
        next(err)
      })
    }).catch(function(err){
      next(err)
    })
  }, function(customer, product, order, trafficPlan, next) {
    next(null, customer, product, order, trafficPlan)
    if(customer.username != "test"){
      autoCharge(order, trafficPlan)
    }
  }], function(err, customer, product, order, trafficPlan){
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

function doCallBack(order, errcode, msg, time){
  if(!order.callbackUrl){
    return
  }
  var params = {
      errcode: errcode,
      errmsg: msg
  }
  if(errcode == '0'){
    params["order"] = {
      transaction_id: order.transactionId,
      number: order.phone,
      product_id: order.exchangerId,
      recharge_fee: order.cost
    }
  }

  var options = {
        uri: order.callbackUrl,
        method: "POST",
        qs: params
      }
  console.log("callbackUrl:")
  console.log(options)
  request(options, function (error, res) {
    if (!error && res.statusCode == 200) {
      console.log("callback return")
        console.log(res.body)
        var data = JSON.parse(res.body)
    }else{
    }
  });
}

function autoCharge(order, trafficPlan){
  order.autoRecharge(trafficPlan).then(function(res, data) {
      console.log(data)
      if(trafficPlan.type == models.TrafficPlan.TYPE['空中平台']){  // 正规空中充值
        if(data.status == 1 || data.status == 2){
          doCallBack(order, "0", "充值成功", 3)
        }else{
          order.updateAttributes({
            state: models.Order.STATE.FAIL
          })
          doCallBack(order, "50014", data.msg, 3)
        }
      }else if(trafficPlan.type == models.TrafficPlan.TYPE['华沃红包'] || trafficPlan.type == models.TrafficPlan.TYPE['华沃全国'] || trafficPlan.type == models.TrafficPlan.TYPE['华沃广东']){
        if(data.code == 1 && data.taskid != 0){
          order.updateAttributes({
            state: models.Order.STATE.SUCCESS,
            taskid: data.taskid
          }).then(function(order){
            doCallBack(order, "0", "充值成功", 3)
          }).catch(function(err) {
            doCallBack(order, "50015", "更新状态失败", 3)
          })
        }else{
          order.updateAttributes({
            state: models.Order.STATE.FAIL
          })
          doCallBack(order, "50014", data.Message, 3)
        }
      }else if(trafficPlan.type == models.TrafficPlan.TYPE['曦和流量']){
        if(data.errcode == 0){
          order.updateAttributes({
            state: models.Order.STATE.SUCCESS,
            taskid: data.order.transaction_id,
            message: "充值成功"
          }).then(function(Order){
            doCallBack(order, "0", "充值成功", 3)
          }).catch(function(err) {
            doCallBack(order, "50015", "更新状态失败", 3)
          })
        }else{
          order.updateAttributes({
            state: models.Order.STATE.FAIL,
            message: data.errmsg
          })
          doCallBack(order, "50014", data.errmsg, 3)
        }
      }else{
        if(data.state == 1){
          order.updateAttributes({
            state: models.Order.STATE.SUCCESS
          }).then(function(order){
            doCallBack(order, "0", "充值成功", 3)
          }).catch(function(err) {
            doCallBack(order, "50015", "更新状态失败", 3)
          })
        }else{
          order.updateAttributes({
            state: models.Order.STATE.FAIL
          })
          doCallBack(order, "50014", data.msg, 3)
        }
      }
    }).catch(function(err){
      doCallBack(order, "50015", "更新状态失败", 3)
    }).do()
}

app.get("/order/detail", function(req, res) {
  var access_token = req.query.access_token,
      sign = req.query.sign,
      order_id = req.query.order_id

  if(!(access_token && sign && order_id)){
    helpers.errRespone(new Error(50010), res)
    return
  }

  async.waterfall([function(next) {
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error(50009))
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
      next(new Error(50005))
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
        next(new Error(50011))
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
    helpers.errRespone(new Error(50013), res)
    return
  }

  async.waterfall([function(next) {
    models.Customer.validateToken(models, access_token).then(function(customer){
      if(customer){
        next(null, customer)
      }else{
        next(new Error(50004))
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
      next(new Error(50005))
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