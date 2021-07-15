require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltrounds = 3;
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookie());
app.use(express.json());

mongoose.connect(process.env.MONGOLINK, {useNewUrlParser:true, useUnifiedTopology: true, useFindAndModify:false});
//mongoose.connect("mongodb://localhost:27017/AuthProject", {useNewUrlParser:true, useUnifiedTopology: true, useFindAndModify:false});


//role
const roleSchema =  new mongoose.Schema({
    name: String,
    scopes: [String],
    created: Date,
    updated: Date
});

const Role = mongoose.model("role", roleSchema);

//user
const userSchema = new mongoose.Schema({
    name: String,
    email: {
       type: String,
       required: true
    },
    password: String,
    created: Date,
    roleID: {
        type: mongoose.Schema.Types.ObjectId,
         ref: 'Role',
        required: true },
    updated: Date
});

const User = mongoose.model("user", userSchema);

//school
const schoolSchema = new mongoose.Schema({
    name: String,
    city: String,
    state: String,
    country: String,
    created: Date,
    updated: Date
});

const School = mongoose.model("school", schoolSchema);

//student
const studentSchema =new mongoose.Schema({
    name: String,
    created: Date,
    updated: Date,
    userID: {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    schoolID: {type: mongoose.Schema.Types.ObjectId, ref: 'School' }
});

const Student = mongoose.model("student", studentSchema);

// ROUTES

app.post("/role", function(req, res){
    let now = new Date();

    Role.findOne({name: req.body.name}, function(err, foundrole){
        if(!err){
            if(foundrole){
                res.send("A role by this name already exists. Please use another name");
            }else{
                const newrole = new Role({
                    name:req.body.name,
                    scopes: req.body.scopes,
                    created: now,
                    updated: null
                });
            
                newrole.save(function(err){
                    if(!err){
                        res.send("New role has been created!" + newrole);
                        console.log(newrole);
                    }else{
                        res.send(err);
                    }
                });
            }
        }
    });

});

app.post("/signup", function(req,res){
    const username = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const wantedrole = req.body.role;
    console.log("Wanted role: " + wantedrole);
   
    let roleid;
    const now= new Date();

    res.cookie("myjwt", "", {maxAge: 1});
    console.log("existing cookies were deleted");

    User.findOne({email: username}, function(err, founduser){
        if(!err){
            if(founduser){
                console.log("Email already exists");
                res.send("Email already exists");
            }
            else{
                console.log("email is unique");
                Role.findOne({name:wantedrole}, function(err, found){
                    if (!err) {
                      if (found) {
                        roleid = found._id;
                        found.updated=now;
                        found.save();
                        console.log("Role id " + found._id);

                        bcrypt.hash(password, saltrounds, function(err, hashed){
                            if(!err){
                                const newuser = new User({
                                    email: username,
                                    password: hashed,
                                    name: name,
                                    roleID: roleid,
                                    created: now, 
                                    updated: null
                                });
                        
                                newuser.save();
                                console.log(newuser);
                                res.status(201).send(newuser);
                            }
                        });
                      }
                      else{
                          res.send("No role of this name exists. Please create a new role if you wish.");
                      }
                    }
                });
            
            }
            
        }

    });

});

app.post("/signin", function(req,res){
    const username = req.body.email;
    const password = req.body.password;

    User.findOne({email: username}, function(err, founduser){
         console.log("searching");
        if(err){
            res.send(err);
        }else if(founduser && !err){
            console.log("comparing");

            bcrypt.compare(password, founduser.password, function(err, result){
                if (!err) {
                  if (result === true) {
                    console.log("CHECK " + founduser);
                    //create a token
                    const newobject = {
                      _id: founduser._id,
                      roleID : founduser.roleID
                    };
                    const accesstoken = jwt.sign(
                      newobject,
                      process.env.ACCESSTOKEN
                    );
                    res.cookie("myjwt", accesstoken, {httpOnly: true });
                    console.log("TOKEN GIVEN  " + accesstoken);
                    res.status(201).send(accesstoken);
                  }
                  else{
                      res.send("Password is incorrect");
                  }
                }
            });

                    
        }
    });

});

//middleware
function routeAuth(req, res, next, scope){
    const accesstoken = req.cookies.myjwt;
    if(accesstoken){
        console.log(accesstoken);

        jwt.verify(accesstoken, process.env.ACCESSTOKEN, function(err, decoded){
            if (err) {
              console.log(err);
              res.send("Incorrect token, please sign in!");
            } else {
              console.log("  User sending request is: ");
              console.log(decoded);
              // next();
              signedInUser=decoded.roleID;

              Role.findById({ _id: decoded.roleID }, function (err, foundrole) {
                if (!err) {
                  let check = false;
                  foundrole.scopes.forEach(function (s) {
                    if (s === scope) {
                      console.log("User has access");
                      check = true;
                    }
                  });
                  if (check) {
                    next();
                  } else {
                    res.send("no access");
                  }
                }
              });
            }
        });
    }
    else{
        res.send("User not logged in. Please visit .../signin");
    }
}

function userGetMiddle(req, res, next){
    return routeAuth(req, res, next, "user-get");
}
function roleGetMiddle(req, res, next){
    return routeAuth(req, res, next, "role-get");
}
function studentCreateMiddle(req, res, next){
    return routeAuth(req, res, next, "student-create");
}
function studentGetMiddle(req, res, next){
    return routeAuth(req, res, next, "student-get");
}
function schoolCreateMiddle(req, res, next){
    return routeAuth(req, res, next, "school-create");
}
function schoolGetMiddle(req, res, next){
    return routeAuth(req, res, next, "student-create");
}
function schoolStudentsMiddle(req, res, next){
    return routeAuth(req, res, next, "school-students");
}

function userIDfinder(req){
    const accesstoken = req.cookies.myjwt;
    let user;
    jwt.verify(accesstoken, process.env.ACCESSTOKEN, function(err, decoded){
        user = decoded._id;
    });
    return user;
};

// OTHER ROUTES...
app.get("/user", userGetMiddle,  function(req,res){

    User.find({}, function(err, foundusers){
        if(!err){
            res.send(foundusers);
        }else{
            res.send(err);
        }
    });

});

app.get("/user/:id", userGetMiddle, function(req, res){
    const userid = req.params.id;

    User.find({_id: userid}, function(err, founduser){
        if(!err){
            res.send(founduser);
        }else{
            res.send(err);
        }
    });
});

app.get("/role", roleGetMiddle, function(req, res){
    Role.find({}, function(err, foundroles){
        if(!err){
            res.send(foundroles);
        }else{
            res.send(err);
        }
    });
});

app.post("/student",studentCreateMiddle, function(req, res){
    const user = userIDfinder(req);
    console.log(user);

    const now = new Date();

    newstudent = new Student({
        name: req.body.name,
        userID: user,
        schoolID: req.body.schoolID,
        created: now,
        updated: null
    });

    newstudent.save();
    console.log(newstudent);

    //update the user too
    User.findById({_id:user}, function(err, founduser){
        if(!err){
            founduser.updated = now;
            founduser.save();
            console.log("user updated after creating a student");
        }
    });

    res.send("New student created " + newstudent);
});

app.get("/student", studentGetMiddle, function(req, res){
    const user = userIDfinder(req);
    console.log(user);

    Student.find({userID: user}, function(err, foundstudents){
        if(!err){
            res.send(foundstudents);
        }
    });
});

app.post("/school",schoolCreateMiddle, function(req, res){
    const now = Date();

    const newschool = new School({
        name: req.body.name,
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        created: now,
        updated: null
    });

    newschool.save();
    res.send("New school has been created" + newschool);
});

app.get("/school", schoolGetMiddle, function(req, res){
    School.find({}, function(err, foundschools){
        if(!err){
            res.send(foundschools);
        }
    });
});


app.get("/school/students", schoolStudentsMiddle, function(req, res){

    res.send("Access to /school/students granted.")

});




app.listen(process.env.PORT || 3000, function() {
    console.log("Server started on port 3000");
  });