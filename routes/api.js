var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var fs = require('fs');
var jwt = require('jsonwebtoken');
var multiparty = require('connect-multiparty')();
var Gridfs = require('gridfs-stream');

var router = express.Router();
var User = require("../models/user");
var Company = require("../models/company");

var ObjectId = require('mongoose').Types.ObjectId; 

var db = process.env.MONGODB_URI | mongoose.connection.db;
var mongoDriver = mongoose.mongo;
var gfs = new Gridfs(db, mongoDriver);

router.post('/signup', function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({success: false, msg: 'Please pass username and password.'});
  } else {
    var newUser = new User({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        return res.json({success: false, msg: 'Username already exists.'});
      }
      res.json({success: true, msg: 'Successful created new user.'});
    });
  }
});

router.post('/signin', function(req, res) {
  User.findOne({
    username: req.body.username
  }, function(err, user) {
    if (err) throw err;

    if (!user) {
      res.status(200).send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: 'JWT ' + token, user: user});
        } else {
          res.status(200).send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

router.post('/company', function(req, res) {
  //var token = getToken(req.headers);
  //if (token) {
    var newCompany = new Company({
      name: req.body.name,
      contact: req.body.contact,
      email: req.body.email,
      phone: req.body.phone
    });

    newCompany.save(function(err, company) {
      if (err) {
        return res.json({success: false, msg: 'Save company failed.'});
      }
      res.json({success: true, msg: 'Successfully created new company.', company: company});
    });
  //} else {
    //return res.status(403).send({success: false, msg: 'Unauthorized.'});
  //}
});

router.put('/company/:companyId', function(req, res) {
  //var token = getToken(req.headers);
  //if (token) {
    var companyId = req.params.companyId;
    Company.findByIdAndUpdate(companyId,
      {name: req.body.name, contact: req.body.contact, email: req.body.email, phone: req.body.phone},
      function (err, company) {
        if (err) {
          return res.json({success: false, msg: 'Update company failed.'});
        }
        res.json({success: true, msg: 'Successfully updated company.'});
    });
  //} else {
    //return res.status(403).send({success: false, msg: 'Unauthorized.'});
  //}
});

router.get('/company', function(req, res) {
  //var token = getToken(req.headers);
  //if (token) {
    Company.find(function (err, companies) {
      if (err) {
        return res.json({success: false, msg: 'Get company failed.'});
      }
      res.json({success: true, companies: companies});
    });
  //} else {
    //return res.status(403).send({success: false, msg: 'Unauthorized.'});
  //}
});

router.post('/upload/:companyId', multiparty, function(req, res){
  req.body.companyId = req.params.companyId;
  Company.findById(req.params.companyId, function (err, company) {
    if (err) {
      return res.json({success: false, msg: 'no company found.'});
    }
    var writestream = gfs.createWriteStream({
      filename: req.files.file.name,
      mode: 'w',
      content_type: req.files.file.type,
      metadata: req.body
    });
    fs.createReadStream(req.files.file.path).pipe(writestream);
    writestream.on('close', function(file) {
      fs.unlink(req.files.file.path, function(err) {
        res.json({success: true, msg: 'Successfully uploaded new document.', file: file});
      });
    });
  });
});

router.get('/download/:fileId', function(req, res) {
  gfs.files.find({_id: ObjectId(req.params.fileId)}).toArray(function(err, files){
    if(!files || files.length === 0){
        return res.json({success: false, msg: 'No document found.'});
    }
    console.log(files[0]);

    /** create read stream */
    var readstream = gfs.createReadStream({
      _id: req.params.fileId
    });
    readstream.pipe(res);

    res.set('Content-Disposition', 'attachment;filename=' + files[0].filename);
    res.set('Content-Type', files[0].contentType);
    res.set('Content-Length', files[0].length);

    readstream.pipe(res);
  });
});

router.delete('/delete/:fileId', function(req, res) {
  gfs.remove({_id: ObjectId(req.params.fileId)}, function (err) {
    if (err) {
      return res.json({success: false, msg: 'Delete files failed.'});
    }
    res.json({success: true});
  });
});

router.get('/files/:companyId', function(req, res) {
  //var token = getToken(req.headers);
  //if (token) {
    gfs.files.find({"metadata.companyId": req.params.companyId}).toArray(function (err, files) {
      if (err) {
        return res.json({success: false, msg: 'Get files failed.'});
      }
      res.json({success: true, files:files});
    });
  //} else {
    //return res.status(403).send({success: false, msg: 'Unauthorized.'});
  //}
});

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;
