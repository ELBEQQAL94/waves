// mongoose
const mongoose = require('mongoose');

// create a schema
const siteSchema = mongoose.Schema({

    featured:{
        required: true,
        type: Array,
        default: []
    },

    siteInfo:{
       required: true,
       type: Array,
       default: []
    }

});

// create a model
const Site = mongoose.model('Site', siteSchema);

module.exports = { Site };