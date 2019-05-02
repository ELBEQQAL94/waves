// mongoose
const mongoose = require('mongoose');

// Create a schema for brand 
const schema = mongoose.Schema;

// create a schema for product
const productSchema = mongoose.Schema({
    
    name : {
      reqiured : true,
      type : String,
      unique : 1,
      maxlength : 20
    },

    description : {
        reqiured : true,
        type : String,
        maxlength: 100
    },

    price : {
        required : true,
        type : Number,
        maxlength: 255
    },

    brand : {
        type : schema.Types.ObjectId,
        ref : 'Brand',
        reqiured : true
    },

    shipping : {
        reqiured : true,
        type : Boolean
    },

    avialable : {
        type : Boolean,
        required : true
    },

    wood : {
        type : schema.Types.ObjectId,
        ref : 'Wood',
        reqiured : true
    },

    frets : {
        reqiured : true,
        type : Number
    },

    sold : {
        type : Number,
        maxlength : 100,
        default : 0
    },

    publish : {
        reqiured : true,
        type : Boolean
    },

    images : {
        type : Array,
        default : []
    }
    
}, { timestamps : true });

// create a model for product
const Product = mongoose.model("Product", productSchema);

module.exports = { Product };