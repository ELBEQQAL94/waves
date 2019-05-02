// mongoose
const mongoose = require('mongoose');

// create a schema
const woodSchema = mongoose.Schema({

    name : {
        required : true,
        type : String,
        unique : 1,
        maxlength : 20
    }

});

// create a model
const Wood = mongoose.model('Wood', woodSchema);

module.exports = { Wood };