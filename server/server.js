// packages
const express          = require('express');

const bodyParser       = require('body-parser');

const cookieParser     = require('cookie-parser')

const mongoose         = require('mongoose');

const cloudinary       = require('cloudinary');

const formidable       = require('express-formidable');

const async            = require('async');


// ===> Models
const { User }     = require('./modules/user');
const { Brand }    = require('./modules/brand');
const { Wood }     = require('./modules/wood');
const { Product }  = require('./modules/product');
const { Payment }  = require('./modules/payment');
const { Site }     = require('./modules/site');

// ==> Middlewar
const { auth }  = require('./middlewar/auth');
const { admin } = require('./middlewar/admin');

// ===> use dotenv for combine with env file
require('dotenv').config();

// ===> send promises with mongoose
mongoose.Promise = global.Promise;

// ===> connect to mongodb
mongoose.connect(process.env.DATABASE);

// ===> Create server with express
const app     = express();

// ===>PORT
const port    = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({extended : true}));

app.use(bodyParser.json());

app.use(cookieParser());

app.listen(port, () => {
    console.log(`server running at ${port} port...`);
});

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET
});

/*  ____ USERS _______ 
*/

// ===> REGISTER PATH
app.post('/api/users/register', (req, res) => {

    const user = new User(req.body);

    user.save((err, doc) => {
        if(err) {
            return res.json({ success : false, err});
        }

        res.status(200).json({
            success : true
        });
    })
});

// ===> LOGIN PATH
app.post('/api/users/login', (req, res) => {
    
    // find the email
     User.findOne({ 'email' : req.body.email}, (err, user) => {
        if(!user) {
            return res.json({
                lginSuccess : false,
                message : 'email not found!'
            });
        }
        
        // check password
        user.comparePassword(req.body.password, (err, isMatch) => {

             if(!isMatch) {
                return res.json({
                    loginSuccess : false,
                    message : 'message is incorrect !'
                });
            }

            // generate a token
            user.generateToken((err, user) => {

              if(err) {
                return req.status(400).send(err);
              }

              res.cookie('w_auth', user.token)
              .status(200).json({
                  loginSuccess : true
              });

            });
        });
        
    });

});

// ===> Auth user
app.get('/api/users/auth', auth, (req, res) => {

    res.status(200).json({

        isAdmin  : req.user.role === 0 ? false : true,
        isAuth   : true,
        email    : req.user.email,
        name     : req.user.name,
        lastname : req.user.lastname,
        role     : req.user.role,
        cart     : req.user.cart,
        history  : req.user.history

    });

});

// ===> LOGIN OUT
app.get('/api/users/logout', auth, (req, res) => {

    User.findOneAndUpdate(
        
        {
            _id : req.user._id
        },

        { 
            token : ''
        },

        (err, data) => {
            if(err) {
                return res.json({
                    isLogout : false,
                    err
                });
            }

            return res.status(200).send({
                logout : true
            });
        }

    )

});

// ===>  Upload Images
app.post('/api/users/uploadimage', auth, admin, formidable(), (req, res) => {
     
    
     cloudinary.uploader.upload(req.files.file.path, (result) => {
        console.log(result);
        res.status(200).send({
            public_id: result.public_id,
            url: result.url
        });
     }, {
         public_id:`${Date.now()}`,
         resource_type:'auto'
     });
});

// ===> REMOVE IMAGE
app.get('/api/users/removeimage', auth, admin, (req, res) => {
    let image_id = req.query.public_id;

    cloudinary.uploader.destroy(image_id, (err, result) => {
       if(err){
           return res.json({
               success : false,
               err
           });
       }

       res.status(200).send('OK!');

    });
});

// ===> ADD ITEM TO CART
app.post('/api/users/add_to_cart', auth, (req, res) => {
    
    User.findOne({
        _id:req.user._id
    }, (err, data) => {

        let dublicate = false;

        data.cart.forEach((item) => {

            if(item.id == req.query.productId) {
                 dublicate = true;
            }

        });

        console.log(dublicate);

        if(dublicate) {
           
            User.findOneAndUpdate(

                {
                    _id : req.user._id,
                    "cart.id" : mongoose.Types.ObjectId(req.query.productId)
                },

                {$inc: {
                    "cart.$.quantity" : 1
                }
               },

               { new : true },

               () => {

                if(err) {
                    return res.json({
                        success : false,
                        err
                    });
                }

                res.status(200).json(data.cart);

               }

            );

        } else {
           User.findOneAndUpdate(
               {
                   _id: req.user._id
               },

               {
                  $push:{
                      cart:{
                        id : mongoose.Types.ObjectId(req.query.productId),
                        quantity:1,
                        date: Date.now()
                      }
                  }
                  
               },

               { new : true },

               (err, data) => {
                   if(err) {
                       return res.json({
                           success : false,
                           err
                       });
                   }

                   res.status(200).json(data.cart);
               }
           )
        }

    });
});

// REMOVE PRODUCT
app.get('/api/users/remove_item', auth, (req, res) => {
  
     User.findOneAndUpdate(
         {
            _id : req.user._id
         },
         {
            "$pull" : {
                "cart" : {
                    "id" : mongoose.Types.ObjectId(req.query._id)
                    }
                }
         },
         { new : true },
         (err, data) => {
             let cart = data.cart;
             let array = cart.forEach((item) => {
                return mongoose.Types.ObjectId(item.id);
             });

             Product.find({"_id" : {$in : array }})
             .populate('wood')
             .populate('brand')
             .exec((err, cartDetail) => {
                return res.status(200).json({
                    cart,
                    cartDetail
                });
             });
         }
     )
});

// BUY PRODUCT
app.post('/api/users/successBuy', auth, (req, res) => {
  
    let history = [];
    let transactionData = {};

    // USER HISTORY
    req.body.cartDetail.forEach(item => {
        history.push({
            dateOfPurchase: Date.now(),
            name: item.name,
            brand: item.brand.name,
            id: item._id,
            price: item.price,
            quantity: item.quantity,
            paymentId: req.body.paymentData.paymentID
        });
    });

    // PAYMENTS DASHBOARD
    transactionData.user = {
        id: req.user._id,
        name: req.user.name,
        lastname: req.user.lastname,
        email: req.user.email
    };

    transactionData.data = req.body.paymentData;

    transactionData.product = history;

    User.findOneAndUpdate(
        {
            _id: req.user._id
        },
        {
            $push: {
                history: history
            },
            $set:{
                cart: []
            }
        },
        { new: true },

        (err, user) => {
            if(err) return res.json({success: false, err});

            const payment = new Payment(transactionData);

            payment.save((err, data) => {
                if(err) return res.json({success: false, err});
                 
                let products = [];

                data.product.forEach(item => {
                   products.push({
                       id: item.id,
                       quantity: item.quantity
                   })
                });

                async.eachSeries(products, (item, callback) => {
                    // update 
                    Product.update(
                        {_id: item.id},

                        {
                            $inc: {
                                "sold" : item.quantity
                            }
                        },

                        { new: false },
                        callback
                        )
                }, (err) => {
                    if(err) return res.json({success: false, err});
                    res.status(200).json({
                        success: true,
                        cart: user.cart,
                        cartDetail: []
                    });
                });
            });
        }
    );

});

// UPDATE PROFILE
app.post('/api/users/update_profile', auth, (req, res) => {

    User.findOneAndUpdate(
        {
            _id: req.user._id
        },

        {
            "$set": req.body
        },
        { new: true },
        (err, data) => {
            if(err) return res.json({success: false, err});
            return res.status(200).send({
                success: true
            });
        }
    );
});

/*
   _______ BRAND _______

*/

// ==> Auth to post a brand

app.post('/api/product/brand', auth, admin, (req, res) => {
    
    // call brand
    const brand = new Brand(req.body);

    // save brand
    brand.save((err, data) => {
     
        if(err) {
            return res.json({
                success : false,
                err
            });

        }

        return res.status(200).json({
            success : true,
            brand : data
        });

        
    });

});

// ==> Auth to post a brand
app.get('/api/product/get_brands', (req, res) => {

    // find all brands
    Brand.find({}, (err, brands) => {

        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).send(brands);

    });

});

/*
   _______ WOODS _______

*/

// ==> add wood
app.post('/api/product/wood', auth, admin, (req, res) => {
    
    const wood = new Wood(req.body);

    wood.save((err, data) => {
       
        if(err){
            return res.status(400).json({
                success : false,
                err
            });
        }

        return res.status(200).json({
            success : true,
            wood : data
        });

    });

});

// ===> get all woods
app.get('/api/product/get_woods', (req, res) => {

    Wood.find({}, (err, woods) => {
        
        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).send(woods);

    });

});

/*
   _______ PRODUCTS _______

*/

// ===> post product
app.post('/api/product/article', auth, admin, (req, res) => {
  
    const product = new Product(req.body);

    product.save((err, data) => {
       
        if(err) {
            return res.status(400).json({
                success : false,
                err
            });

        }

        return res.status(200).json({
            success : true,
            article : data
        });

    });
});

// ===> get products
app.get('/api/product/get_articls', (req, res) => {

    Product.find({}, (err, products) => {

        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).send(products);

    });

});

// ===> get product by id
// /api/product/articles_by_id?id=hwgfhoiqhwfjhoiwfp, oihwfjpjfjwj, whfjhqwgfkj&type=single
app.get('/api/product/articles_by_id', (req, res) => {

    // get type of product
    let type = req.query.type;

    // get items
    let items= req.query.id;

    if(type === "array") {
        let ids = req.query.id.split(',');
        items = [];
        items = ids.map(item => {
            return mongoose.Types.ObjectId(item);
        });
    }

    Product.find({ '_id' : {$in : items}})

    .populate('brand')

    .populate('wood')

    .exec((err, data) => {
       
        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).send(data);

    });

});

// ===> get product by arrival
// /articles?sortBy=createAt&order=desc&limit=4

// ===> get product by seel
// /articles?sortBy=sold&order=desc&limit=100

app.get('/api/product/articles', (req, res) => {

    // get order from database
    let order = req.query.order ? req.query.order : "asc";

    // get sortBy 
    let sortBy = req.query.sortBy ? req.query.sortBy : "_id";

    // get limit
    let limit = req.query.limit ? parseInt(req.query.limit) : 100;

    Product.find()

    .populate('brand')

    .populate('wood')

    .sort([[sortBy, order]])

    .limit(limit)

    .exec((err, articles) => {

        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).send(articles);

    });
});


app.post('/api/product/shop', (req, res) => {

    const body = req.body;

    let order = body.order ? body.order : "desc";

    let sortBy = body.sortBy ? body.sortBy : "_id";

    let limit  = body.limit ? parseInt(body.limit) : 100;
     
    let skip   = parseInt(body.skip);
    
    let findArgs = {};

    for(let key in body.filters ) {

        // CHECK IF FILTERS IS EMPTY OR NOT
        if(body.filters[key].length > 0){

            if(key === 'price') {
               
                findArgs[key] = {
                    $gte : body.filters[key][0],
                    $lte : body.filters[key][1]
                }

            } else {
                findArgs[key] = body.filters[key];
            }
        }
    }

    findArgs['publish'] = true;

    Product.find(findArgs)
    .populate('brand')
    .populate('wood')
    .sort([[sortBy, order]])
    .skip(skip)
    .limit(limit)
    .exec((err, articles) => {
       
        if(err) {
            return res.status(400).send(err);
        }

        return res.status(200).json({
            size : articles.length,
            articles
        });
        
    });

});

/*
   _______SITE______

*/

app.get('/api/site/site_data', (req, res) => {
    Site.find({},(err, site) => {
        if(err) return res.status(400).send(err);
        res.status(200).send(site[0].siteInfo);
    });
});

app.post('/api/site/site_data', auth, admin, (req, res) => {
      
     Site.findOneAndUpdate(
        { name: 'Site'},
        { "$set":{
            siteInfo: req.body
            }
        },
        { new: true},
        (err, data) => {
            if(err) return res.status(400).json({success: false, err});
            return res.status(200).json({
                success: true,
                siteInfo: data.siteInfo
            });
        } 
     )
});

