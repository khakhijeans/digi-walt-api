var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompanyDocSchema = new Schema({
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  file_id: {
    type: Schema.Types.ObjectId
  }
});

module.exports = mongoose.model('CompanyDoc', CompanyDocSchema);
