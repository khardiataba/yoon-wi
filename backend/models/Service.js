const mongoose = require("mongoose")

const ServiceSchema = new mongoose.Schema({

title:String,

category:String,

description:String,

price:Number,

provider:String

})

module.exports = mongoose.model("Service",ServiceSchema)