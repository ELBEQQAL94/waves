// mongoose
const mongoose = require('mongoose');

// Create a schema
const brandSchema = mongoose.Schema({
    name : {
        required : true,
        type : String,
        unique : 1,
        maxlength : 20
    }
});

// Create model 
const Brand = mongoose.model('Brand', brandSchema);

module.exports = { Brand };