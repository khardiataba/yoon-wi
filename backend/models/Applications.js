const mongoose = require("mongoose")

const ApplicationSchema = new mongoose.Schema({

name:String,

phone:String,

jobType:String,

experience:String,

idCard:String,

drivingLicense:String,

status:{
type:String,
default:"pending"
}

})

module.exports = mongoose.model("Application",ApplicationSchema)