const mongoose         = require('mongoose');
const bcrypt           = require('bcrypt');
const SALT_I           = 10;
const jsonwebtoken     = require('jsonwebtoken');

require('dotenv').config();

/*  REGISTER PASSWORD IN SCHEMA*/
const userSchema = mongoose.Schema({
    // email
    email:{
        type:String,
        required:true,
        trim:true,
        unique:1
    },

    // password
    password:{
       type:String,
       required:true,
       minlenght:5
    },

    // name
    name:{
        type:String,
        required:true,
        maxlength:20
    },

    // lastname
    lastname:{
        type:String,
        required:true,
        maxlength: 20
    },

    // cart
    cart:{
        type:Array,
        default:[]
    },

    // history
    history:{
        type:Array,
        default:[]
    },

    // role
    role:{
        type:Number,
        default:0
    },

    // token
    token:{
        type:String
    }
    

});

/* HASHING PASSWORD */

userSchema.pre('save', function(next){

    var user = this;

    // user try to modified passsword
    if(user.isModified('password')){
        bcrypt.genSalt(SALT_I, function(err, salt){

            if(err) return next(err);
    
            bcrypt.hash(user.password, salt, function(err, hash){
               if(err) return next(err);
               user.password = hash;
               next();
            });
    
        });

    } else {
        next();
    }
    

});

/*  COMPARE PASSWORD */
userSchema.methods.comparePassword = function(password, callback){
    bcrypt.compare(password, this.password, function(err, isMatch){
       if(err) {
           return callback(err);
       }

       callback(null, isMatch);

    });
}

/* GENERATE TOKEN */
userSchema.methods.generateToken = function(callback){

    var user  = this;

    var token = jsonwebtoken.sign(user._id.toHexString(),process.env.SERCRET);

    user.token = token;

    user.save(function(err, user){
      if(err) {
        return callback(err);
      }
      
      callback(null , user);

    });
}

/* FIND BY TOKEN */

userSchema.statics.findByToken = function(token, callback){

    var user = this;

    jsonwebtoken.verify(token, process.env.SERCRET, function(err, decode){
        
        user.findOne({ "_id" : decode, "token" : token}, function(err, user) {

            if(err) {
                return callback(err);
            }

            callback(null, user);

        });

    })
}

/* TRANSFORM USER TO MODEL BY MONGOOSE */
const User = mongoose.model('User', userSchema);

/* EXPORT USER MODEL */
module.exports  = { User };